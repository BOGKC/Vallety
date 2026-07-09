import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { ModeSwitcher } from './ModeSwitcherMobile'
import { AnimatedBackground } from '../../components/AnimatedBackground'
import { BottomTabBar } from '../../components/BottomTabBar'
import { OfflineBanner } from '../../components/OfflineBanner'
import { InstallBanner } from '../../components/InstallBanner'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import { CircleSpinner } from '../../components/loaders'
import { resolvePageTitle } from '../lib/pageTitles'

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

// ── Pull-to-refresh (touch only) ──────────────────────────────────────────────

const PULL_TRIGGER = 72 // px past which release triggers a refresh

/**
 * Custom pull-to-refresh for the main scroll region. Engages only when the
 * scroll is already at the top and the gesture is a downward drag, so it never
 * fights normal scrolling. On release past the threshold it runs onRefresh
 * (which re-reads local data by remounting the route) with a branded spinner.
 */
function usePullToRefresh(
  scrollRef: React.RefObject<HTMLElement | null>,
  onRefresh: () => void
) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (!window.matchMedia('(hover: none)').matches) return // touch devices only

    const onStart = (e: TouchEvent) => {
      startY.current = el.scrollTop <= 0 ? e.touches[0].clientY : null
    }
    const onMove = (e: TouchEvent) => {
      if (startY.current === null || refreshing) return
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) { setPull(0); return }
      // Rubber-band: resistance grows with distance.
      setPull(Math.min(dy * 0.5, 96))
    }
    const onEnd = () => {
      if (startY.current === null) return
      if (pull >= PULL_TRIGGER && !refreshing) {
        setRefreshing(true)
        setPull(PULL_TRIGGER)
        onRefresh()
        window.setTimeout(() => { setRefreshing(false); setPull(0) }, 650)
      } else {
        setPull(0)
      }
      startY.current = null
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [scrollRef, onRefresh, pull, refreshing])

  return { pull, refreshing }
}

// ── App Shell ─────────────────────────────────────────────────────────────────

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  const { pull, refreshing } = usePullToRefresh(mainRef, () => setRefreshKey((k) => k + 1))

  // Close drawer on navigation. rAF defers the state update out of the effect
  // body (avoids a synchronous setState-in-effect).
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawerOpen(false))
    return () => cancelAnimationFrame(id)
  }, [location.pathname])

  // Keep the browser tab title in sync with the current route.
  useEffect(() => {
    document.title = `${resolvePageTitle(location.pathname)} — Vallety`
  }, [location.pathname])

  return (
    // `isolate` creates a stacking context so the negative-z animated
    // background paints above this div's own background but below content.
    <div className="relative isolate flex h-screen overflow-hidden bg-bg-primary">
      <AnimatedBackground />
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col h-full">
        <Sidebar />
      </div>

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0">
        <OfflineBanner />
        <TopBar onMenuClick={() => setDrawerOpen(true)} />

        <main ref={mainRef} className="relative flex-1 overflow-y-auto">
          {/* Pull-to-refresh indicator */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
            style={{
              height: pull,
              opacity: pull > 8 ? 1 : 0,
              transition: refreshing ? 'none' : 'height 200ms ease, opacity 200ms ease',
            }}
            aria-hidden
          >
            <div
              className="mt-2"
              style={{ transform: `rotate(${pull * 3}deg)`, opacity: Math.min(pull / PULL_TRIGGER, 1) }}
            >
              <CircleSpinner size={22} />
            </div>
          </div>

          {/* key on pathname + refreshKey so the incoming route fades + slides
              up on change, and a pull-to-refresh remounts it (re-reading local
              data). Extra bottom padding on mobile clears the fixed tab bar.
              Each route is wrapped in an ErrorBoundary so a crash in one page
              never takes down the shell. */}
          <div
            key={`${location.pathname}:${refreshKey}`}
            className="page-enter px-4 pt-5 pb-[calc(72px+env(safe-area-inset-bottom))] sm:px-6 md:pb-6"
            style={{ transform: pull ? `translateY(${pull}px)` : undefined, transition: refreshing ? 'none' : 'transform 200ms ease' }}
          >
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Mobile drawer (full nav via hamburger) */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Custom install prompt (engagement-gated, iOS + Android) */}
      <InstallBanner />

      {/* Mobile bottom tab bar */}
      <BottomTabBar />
    </div>
  )
}
