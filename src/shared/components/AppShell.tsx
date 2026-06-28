import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { ModeSwitcher } from './ModeSwitcherMobile'
import { BottomTabBar } from '../../components/BottomTabBar'
import { OfflineBanner } from '../../components/OfflineBanner'
import { ErrorBoundary } from '../../components/ErrorBoundary'

// ── Mobile bottom-sheet drawer ────────────────────────────────────────────────

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
}

function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-black/70 transition-opacity duration-[220ms] md:hidden ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`fixed bottom-0 left-0 right-0 z-[60] bg-bg-secondary border-t border-border rounded-t-2xl transition-transform duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag handle + close */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="mx-auto h-1 w-10 rounded-full bg-border absolute left-1/2 -translate-x-1/2 top-3" />
          <div className="w-7" />
          <button
            onClick={onClose}
            className="ml-auto h-7 w-7 flex items-center justify-center rounded-full bg-bg-card text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode switcher inside drawer */}
        <div className="px-4 pb-3 pt-1">
          <ModeSwitcher onNavigate={onClose} />
        </div>

        {/* Nav items via Sidebar in mobile mode */}
        <div className="overflow-y-auto max-h-[60vh] pb-safe-bottom">
          <Sidebar mobile />
        </div>

        {/* iOS safe area spacer */}
        <div className="pb-6" />
      </div>
    </>
  )
}

// ── App Shell ─────────────────────────────────────────────────────────────────

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  // Close drawer on navigation. rAF defers the state update out of the effect
  // body (avoids a synchronous setState-in-effect).
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawerOpen(false))
    return () => cancelAnimationFrame(id)
  }, [location.pathname])

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col h-full">
        <Sidebar />
      </div>

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0">
        <OfflineBanner />
        <TopBar onMenuClick={() => setDrawerOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          {/* key on pathname so the incoming route fades + slides up on change.
              Extra bottom padding on mobile clears the fixed bottom tab bar.
              Each route is wrapped in an ErrorBoundary keyed on the path so a
              crash in one page never takes down the shell, and navigating away
              clears the error. */}
          <div
            key={location.pathname}
            className="page-enter px-6 pt-6 pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-6"
          >
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Mobile drawer (full nav via hamburger) */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Mobile bottom tab bar */}
      <BottomTabBar />
    </div>
  )
}
