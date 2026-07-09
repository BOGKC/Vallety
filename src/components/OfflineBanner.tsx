import { useEffect, useRef, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../shared/hooks/useOnlineStatus'

/** Probe the network directly — navigator.onLine can lag behind reality. */
async function pingServer(): Promise<boolean> {
  try {
    await fetch('/favicon.svg', { method: 'HEAD', cache: 'no-store' })
    return true
  } catch {
    return false
  }
}

const RETRY_SECONDS = 5

/**
 * Slim status banner at the very top of the app.
 *  - Offline: reassures that local data is safe, counts down to the next
 *    automatic reconnect attempt ("Retrying in 5…"), and offers "Retry now".
 *  - Back online: a brief "Back online ✓" confirmation, auto-dismissed.
 * Slides down (height transition) so it never abruptly shifts the layout.
 */
export function OfflineBanner() {
  const online = useOnlineStatus()
  const [showBack, setShowBack] = useState(false)
  const [countdown, setCountdown] = useState(RETRY_SECONDS)
  const [checking, setChecking] = useState(false)
  const [forcedOnline, setForcedOnline] = useState(false)
  const prevOnline = useRef(online)

  const effectiveOnline = online || forcedOnline

  // Brief "Back online ✓" when connectivity returns.
  useEffect(() => {
    if (prevOnline.current === effectiveOnline) return
    const cameBack = effectiveOnline && prevOnline.current === false
    prevOnline.current = effectiveOnline
    if (cameBack) {
      // rAF avoids a synchronous setState in the effect body.
      const raf = requestAnimationFrame(() => setShowBack(true))
      const timer = window.setTimeout(() => setShowBack(false), 2000)
      return () => {
        cancelAnimationFrame(raf)
        window.clearTimeout(timer)
      }
    }
  }, [effectiveOnline])

  // While offline: tick a visible countdown; at zero, probe the network.
  useEffect(() => {
    if (effectiveOnline) return
    // rAF avoids a synchronous setState in the effect body.
    const raf = requestAnimationFrame(() => setCountdown(RETRY_SECONDS))
    const id = window.setInterval(() => {
      setCountdown((c) => (c <= 1 ? RETRY_SECONDS : c - 1))
    }, 1000)
    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(id)
    }
  }, [effectiveOnline])

  useEffect(() => {
    if (effectiveOnline || countdown !== RETRY_SECONDS) return
    // Countdown just wrapped → attempt a reconnect probe.
    let cancelled = false
    pingServer().then((ok) => {
      if (ok && !cancelled) setForcedOnline(true)
    })
    return () => { cancelled = true }
  }, [countdown, effectiveOnline])

  // Browser reports online again → clear any forced state.
  useEffect(() => {
    if (!online) return
    const raf = requestAnimationFrame(() => setForcedOnline(false))
    return () => cancelAnimationFrame(raf)
  }, [online])

  const retryNow = async () => {
    setChecking(true)
    const ok = await pingServer()
    setChecking(false)
    if (ok) setForcedOnline(true)
    else setCountdown(RETRY_SECONDS)
  }

  const visible = !effectiveOnline || showBack

  return (
    <div
      className="overflow-hidden"
      style={{ height: visible ? 36 : 0, transition: 'height 200ms ease' }}
      aria-live="polite"
    >
      {effectiveOnline ? (
        <div
          className="flex h-9 items-center justify-center gap-2 text-[13px] font-medium"
          style={{
            backgroundColor: 'var(--color-success-muted)',
            borderBottom: '1px solid var(--color-success)',
            color: 'var(--color-success)',
          }}
        >
          Back online ✓
        </div>
      ) : (
        <div
          className="flex h-9 items-center justify-center gap-2.5 px-4 text-center text-[13px]"
          style={{
            backgroundColor: 'var(--color-warning-muted)',
            borderBottom: '1px solid var(--color-warning)',
            color: 'var(--color-warning)',
          }}
        >
          <WifiOff size={14} className="wifi-pulse flex-shrink-0" />
          <span className="truncate">
            You're offline — changes are saved on this device.
            <span className="hidden sm:inline"> Retrying in {countdown}…</span>
          </span>
          <button
            onClick={retryNow}
            disabled={checking}
            className="flex-shrink-0 rounded px-1.5 font-semibold underline-offset-2 hover:underline disabled:opacity-60"
            style={{ minHeight: 0 }}
          >
            {checking ? 'Checking…' : 'Retry now'}
          </button>
        </div>
      )}
    </div>
  )
}
