import { useEffect, useRef, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../shared/hooks/useOnlineStatus'

/**
 * Slim status banner at the very top of the app.
 *  - Offline: persistent warning that changes are saved locally.
 *  - Back online: a brief "Back online ✓" confirmation that auto-dismisses
 *    after 2 seconds.
 * Slides down (height transition) so it never abruptly shifts the layout.
 */
export function OfflineBanner() {
  const online = useOnlineStatus()
  const [showBack, setShowBack] = useState(false)
  const prevOnline = useRef(online)

  useEffect(() => {
    if (prevOnline.current === online) return
    const cameBackOnline = online && prevOnline.current === false
    prevOnline.current = online
    if (cameBackOnline) {
      // rAF avoids a synchronous setState in the effect body.
      const raf = requestAnimationFrame(() => setShowBack(true))
      const timer = window.setTimeout(() => setShowBack(false), 2000)
      return () => {
        cancelAnimationFrame(raf)
        window.clearTimeout(timer)
      }
    }
  }, [online])

  const visible = !online || showBack

  return (
    <div
      className="overflow-hidden"
      style={{ height: visible ? 36 : 0, transition: 'height 200ms ease' }}
      aria-live="polite"
    >
      {online ? (
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
          className="flex h-9 items-center justify-center gap-2 px-4 text-center text-[13px]"
          style={{
            backgroundColor: 'var(--color-warning-muted)',
            borderBottom: '1px solid var(--color-warning)',
            color: 'var(--color-warning)',
          }}
        >
          <WifiOff size={14} className="flex-shrink-0" />
          <span>You're offline — your data is saved on this device and stays available.</span>
        </div>
      )}
    </div>
  )
}
