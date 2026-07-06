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
    { label: 'Dashboard', icon: LayoutDashboard, to: '/', end: true },
    { label: 'Transactions', icon: ArrowLeftRight, to: '/transactions' },
    { label: 'Budgets', icon: Target, to: '/budgets' },
    { label: 'Net worth', icon: TrendingUp, to: '/net-worth' },
    { label: 'AI Advisor', icon: Sparkles, to: '/advisor' },
  ],
  business: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/business', end: true },
    { label: 'Invoices', icon: FileText, to: '/business/invoices' },
    { label: 'Expenses', icon: Receipt, to: '/business/expenses' },
    { label: 'Tax & ALV', icon: Percent, to: '/business/tax' },
    { label: 'AI Advisor', icon: Sparkles, to: '/advisor' },
  ],
  investment: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/investment', end: true },
    { label: 'Portfolio', icon: PieChart, to: '/investment/portfolio' },
    { label: 'Watchlist', icon: Eye, to: '/investment/watchlist' },
    { label: 'Transactions', icon: ArrowLeftRight, to: '/transactions' },
    { label: 'AI Advisor', icon: Sparkles, to: '/advisor' },
  ],
}

/** Fixed bottom navigation, mobile only (hidden at md and up). Mode-aware. */
export function BottomTabBar() {
  const mode = useAppStore((s) => s.mode)
  const tabs = MODE_TABS[mode] ?? MODE_TABS.personal
  return (
    <nav
      className="fixed bottom-0 left-0 z-50 flex w-full border-t border-subtle bg-bg-secondary md:hidden"
      style={{ height: 'calc(56px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      {tabs.map((t) => {
        const Icon = t.icon
        return (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className="nav-item flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5"
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-accent)' : 'var(--text-secondary)',
            })}
          >
            <Icon size={20} />
            <span className="w-full truncate text-center text-[10px]">{t.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
