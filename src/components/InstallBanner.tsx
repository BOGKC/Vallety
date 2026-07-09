import { useEffect, useState } from 'react'
import { X, Share, Plus } from 'lucide-react'
import { usePWAInstall } from '../shared/hooks/usePWAInstall'
import { ValletyMark } from './ValletyLogo'

const DISMISS_KEY = 'vallety_install_dismissed'
const ENGAGE_MS = 30_000 // don't nag on first load — wait for real engagement

/**
 * Tasteful custom install experience. Appears at the bottom only after the
 * user has spent ~30s in the app (never on first paint), and never again once
 * dismissed or installed. Android/Chrome gets the native prompt; iOS Safari
 * gets the manual Share → Add to Home Screen instructions.
 */
export function InstallBanner() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall()
  const [engaged, setEngaged] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (dismissed || isInstalled) return
    const id = window.setTimeout(() => setEngaged(true), ENGAGE_MS)
    return () => window.clearTimeout(id)
  }, [dismissed, isInstalled])

  const close = () => {
    setLeaving(true)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
    window.setTimeout(() => setDismissed(true), 260)
  }

  const install = async () => {
    const accepted = await promptInstall()
    if (accepted) close()
  }

  // Show only when engaged, not dismissed, not already installed, and either
  // a native prompt exists (Android) or we're on iOS Safari (manual path).
  const eligible = engaged && !dismissed && !isInstalled && (canInstall || isIOS)
  if (!eligible) return null

  return (
    <div
      className="fixed inset-x-0 z-[65] flex justify-center px-3 md:px-0"
      style={{ bottom: 'calc(56px + env(safe-area-inset-bottom) + 12px)' }}
      role="dialog"
      aria-label="Install Vallety"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-default)',
          transform: leaving ? 'translateY(140%)' : 'translateY(0)',
          opacity: leaving ? 0 : 1,
          transition: 'transform 260ms var(--ease-out-expo), opacity 260ms ease',
          animation: leaving ? undefined : 'install-slide-up 320ms var(--ease-out-expo)',
        }}
      >
        <div className="flex items-start gap-3 p-4">
          <span
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <ValletyMark size={26} />
          </span>

          <div className="min-w-0 flex-1">
            {isIOS ? (
              <>
                <p className="text-[14px] font-semibold text-text-primary">Add Vallety to your Home Screen</p>
                <p className="mt-1 flex flex-wrap items-center gap-1 text-[13px] text-text-secondary">
                  Tap
                  <Share className="mx-0.5 inline h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                  in the toolbar, then
                  <span className="inline-flex items-center gap-1 font-medium text-text-primary">
                    <Plus className="h-3.5 w-3.5" /> Add to Home Screen
                  </span>
                </p>
              </>
            ) : (
              <>
                <p className="text-[14px] font-semibold text-text-primary">Add Vallety to your home screen</p>
                <p className="mt-0.5 text-[13px] text-text-secondary">
                  Install the app for instant access and a full-screen, offline-ready experience.
                </p>
                <button
                  onClick={install}
                  className="btn-accent mt-3 inline-flex h-9 items-center rounded-md px-4 text-[13px] font-semibold text-white"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  Install
                </button>
              </>
            )}
          </div>

          <button
            onClick={close}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-bg-card hover:text-text-primary"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
