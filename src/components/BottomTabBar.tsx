import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, Target, TrendingUp, Sparkles, type LucideIcon } from 'lucide-react'

interface Tab {
  label: string
  icon: LucideIcon
  to: string
  end?: boolean
}

const TABS: Tab[] = [
  { label: 'Home', icon: LayoutDashboard, to: '/', end: true },
  { label: 'Money', icon: ArrowLeftRight, to: '/transactions' },
  { label: 'Plan', icon: Target, to: '/budgets' },
  { label: 'Wealth', icon: TrendingUp, to: '/net-worth' },
  { label: 'AI', icon: Sparkles, to: '/advisor' },
]

/** Fixed bottom navigation, mobile only (hidden at md and up). */
export function BottomTabBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 z-50 flex w-full border-t border-subtle bg-bg-secondary md:hidden"
      style={{ height: 'calc(56px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      {TABS.map((t) => {
        const Icon = t.icon
        return (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className="nav-item flex flex-1 flex-col items-center justify-center gap-0.5"
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-accent)' : 'var(--text-muted)',
            })}
          >
            <Icon size={20} />
            <span className="text-[10px]">{t.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
