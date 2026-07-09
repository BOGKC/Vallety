import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Target, TrendingUp, Sparkles,
  FileText, Receipt, Percent, PieChart, Eye, type LucideIcon,
} from 'lucide-react'
import { useAppStore } from '../shared/store/appStore'
import type { AppMode } from '../shared/types'

interface Tab {
  label: string
  icon: LucideIcon
  to: string
  end?: boolean
}

const MODE_TABS: Record<AppMode, Tab[]> = {
  personal: [
    { label: 'Home', icon: LayoutDashboard, to: '/', end: true },
    { label: 'Money', icon: ArrowLeftRight, to: '/transactions' },
    { label: 'Plan', icon: Target, to: '/budgets' },
    { label: 'Wealth', icon: TrendingUp, to: '/net-worth' },
    { label: 'Advisor', icon: Sparkles, to: '/advisor' },
  ],
  business: [
    { label: 'Home', icon: LayoutDashboard, to: '/business', end: true },
    { label: 'Invoices', icon: FileText, to: '/business/invoices' },
    { label: 'Expenses', icon: Receipt, to: '/business/expenses' },
    { label: 'Tax', icon: Percent, to: '/business/tax' },
    { label: 'Advisor', icon: Sparkles, to: '/advisor' },
  ],
  investment: [
    { label: 'Home', icon: LayoutDashboard, to: '/investment', end: true },
    { label: 'Portfolio', icon: PieChart, to: '/investment/portfolio' },
    { label: 'Watchlist', icon: Eye, to: '/investment/watchlist' },
    { label: 'Money', icon: ArrowLeftRight, to: '/transactions' },
    { label: 'Advisor', icon: Sparkles, to: '/advisor' },
  ],
}

/**
 * Fixed bottom navigation, mobile only (hidden at md and up). Mode-aware.
 * The active tab shows an accent icon/label plus a small pill above the icon
 * that slides to the active tab (transform-only) when you switch.
 */
export function BottomTabBar() {
  const mode = useAppStore((s) => s.mode)
  const tabs = MODE_TABS[mode] ?? MODE_TABS.personal

  return (
    <nav
      className="fixed bottom-0 left-0 z-50 flex w-full select-none border-t border-subtle md:hidden"
      style={{
        height: 'calc(56px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 82%, transparent)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
      }}
      aria-label="Primary"
    >
      {tabs.map((t) => {
        const Icon = t.icon
        return (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className="nav-item relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5"
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-accent)' : 'var(--text-secondary)',
            })}
          >
            {({ isActive }) => (
              <>
                {/* Active pill above the icon */}
                <span
                  aria-hidden
                  className="absolute top-1 h-1 rounded-full"
                  style={{
                    width: 18,
                    backgroundColor: 'var(--color-accent)',
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? 'scaleX(1)' : 'scaleX(0.3)',
                    transition: 'opacity 200ms ease, transform 260ms var(--ease-out-back)',
                  }}
                />
                <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
                <span className="w-full truncate text-center text-[10px] font-medium leading-none">
                  {t.label}
                </span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
