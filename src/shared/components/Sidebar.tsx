import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, PieChart, Target, Receipt,
  CreditCard, TrendingUp, Users, FileText, DollarSign, Car,
  Calculator, Briefcase, Eye, Settings, Sparkles, ChevronLeft,
  ChevronRight, Wallet, type LucideIcon,
} from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { cn } from '../lib/cn'
import type { AppMode } from '../types'

// ── Nav data ──────────────────────────────────────────────────────────────────

interface NavItem { label: string; icon: LucideIcon; to: string }

const MODE_NAV: Record<AppMode, NavItem[]> = {
  personal: [
    { label: 'Dashboard',    icon: LayoutDashboard, to: '/personal' },
    { label: 'Transactions', icon: ArrowLeftRight,  to: '/personal/transactions' },
    { label: 'Budgets',      icon: PieChart,        to: '/personal/budgets' },
    { label: 'Goals',        icon: Target,          to: '/personal/goals' },
    { label: 'Bills',        icon: Receipt,         to: '/personal/bills' },
    { label: 'Debts',        icon: CreditCard,      to: '/personal/debts' },
    { label: 'Net Worth',    icon: TrendingUp,      to: '/personal/net-worth' },
  ],
  business: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/business' },
    { label: 'Clients',   icon: Users,           to: '/business/clients' },
    { label: 'Invoices',  icon: FileText,        to: '/business/invoices' },
    { label: 'Expenses',  icon: DollarSign,      to: '/business/expenses' },
    { label: 'Mileage',   icon: Car,             to: '/business/mileage' },
    { label: 'Tax',       icon: Calculator,      to: '/business/tax' },
  ],
  investment: [
    { label: 'Dashboard',    icon: LayoutDashboard, to: '/investment' },
    { label: 'Portfolio',    icon: Briefcase,       to: '/investment/portfolio' },
    { label: 'Transactions', icon: ArrowLeftRight,  to: '/investment/transactions' },
    { label: 'Watchlist',    icon: Eye,             to: '/investment/watchlist' },
  ],
}

const BOTTOM_NAV: NavItem[] = [
  { label: 'Settings',   icon: Settings,  to: '/settings' },
  { label: 'AI Advisor', icon: Sparkles,  to: '/advisor' },
]

const MODE_ACTIVE: Record<AppMode, string> = {
  personal:   'bg-brand/10 text-brand',
  business:   'bg-business/10 text-business',
  investment: 'bg-investment/10 text-investment',
}

// ── NavItem component ─────────────────────────────────────────────────────────

function SidebarNavItem({
  item,
  collapsed,
  activeClass,
}: {
  item: NavItem
  collapsed: boolean
  activeClass: string
}) {
  return (
    <NavLink
      to={item.to}
      end={item.to.split('/').length === 2}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
          collapsed ? 'w-10 h-10 justify-center mx-auto' : 'px-3 py-2',
          isActive
            ? activeClass
            : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
        )
      }
    >
      <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
      <span
        style={{
          maxWidth: collapsed ? 0 : 160,
          opacity: collapsed ? 0 : 1,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          transition: 'max-width 150ms ease, opacity 120ms ease',
        }}
      >
        {item.label}
      </span>
    </NavLink>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  /** Render in mobile-drawer mode: no collapse toggle, full-width labels */
  mobile?: boolean
}

export function Sidebar({ mobile = false }: SidebarProps) {
  const { mode, sidebarCollapsed, toggleSidebar } = useAppStore()
  const navigate = useNavigate()

  const collapsed = mobile ? false : sidebarCollapsed
  const activeClass = MODE_ACTIVE[mode]

  const handleLogoClick = () => navigate(`/${mode}`)

  return (
    <aside
      style={{
        width: collapsed ? 64 : 240,
        transition: 'width 150ms ease',
      }}
      className={cn(
        'flex flex-col bg-bg-secondary border-r border-border overflow-hidden flex-shrink-0',
        mobile ? 'w-full' : 'h-full'
      )}
    >
      {/* Logo ─────────────────────────────────────────────────────────────── */}
      <button
        onClick={handleLogoClick}
        className="flex items-center gap-2.5 h-14 px-4 border-b border-border flex-shrink-0 hover:bg-white/5 transition-colors w-full text-left"
        aria-label="Go to dashboard"
      >
        <div className="h-7 w-7 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
          <Wallet className="h-4 w-4 text-white" />
        </div>
        <span
          style={{
            maxWidth: collapsed ? 0 : 120,
            opacity: collapsed ? 0 : 1,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            transition: 'max-width 150ms ease, opacity 120ms ease',
          }}
          className="text-text-primary font-semibold text-base"
        >
          Vallety
        </span>
      </button>

      {/* Mode nav ─────────────────────────────────────────────────────────── */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5',
          collapsed ? 'px-1.5' : 'px-3'
        )}
        aria-label="Main navigation"
      >
        {MODE_NAV[mode].map((item) => (
          <SidebarNavItem
            key={item.to}
            item={item}
            collapsed={collapsed}
            activeClass={activeClass}
          />
        ))}
      </nav>

      {/* Divider ───────────────────────────────────────────────────────────── */}
      <div className="mx-3 border-t border-border" />

      {/* Bottom nav ───────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'py-3 space-y-0.5 flex-shrink-0',
          collapsed ? 'px-1.5' : 'px-3'
        )}
      >
        {BOTTOM_NAV.map((item) => (
          <SidebarNavItem
            key={item.to}
            item={item}
            collapsed={collapsed}
            activeClass="bg-white/10 text-text-primary"
          />
        ))}
      </div>

      {/* Collapse toggle (desktop only) ────────────────────────────────────── */}
      {!mobile && (
        <button
          onClick={toggleSidebar}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center justify-center h-9 border-t border-border text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors flex-shrink-0"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4" />
            : <ChevronLeft  className="h-4 w-4" />
          }
        </button>
      )}
    </aside>
  )
}
