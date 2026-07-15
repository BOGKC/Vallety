import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Target, Calendar, TrendingUp,
  Sparkles, Settings, ChevronLeft, ChevronRight,
  FileText, Receipt, Percent, Users, Home, PieChart, Eye,
  type LucideIcon,
} from 'lucide-react'
import { ValletyMark } from '../../components/ValletyLogo'
import { PremiumBadge } from '../../components/premium/PremiumBadge'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { usePlan } from '../hooks/usePlan'
import { planLabel } from '../lib/plans'
import { APP_VERSION_LABEL } from '../lib/version'
import { cn } from '../lib/cn'
import type { AppMode } from '../types'

// ── Nav data (per mode — modes are lenses, so shared pages recur) ─────────────

interface NavItem {
  label: string
  icon: LucideIcon
  to: string
  end?: boolean
  /** AI Advisor gets a persistent accent treatment + slightly larger icon. */
  accent?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const MODE_NAV: Record<AppMode, NavGroup[]> = {
  personal: [
    {
      label: 'Manage',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, to: '/', end: true },
        { label: 'Transactions', icon: ArrowLeftRight, to: '/transactions' },
      ],
    },
    {
      label: 'Plan',
      items: [
        { label: 'Budgets', icon: Target, to: '/budgets' },
        { label: 'Bills & schedules', icon: Calendar, to: '/bills' },
      ],
    },
    {
      label: 'Grow',
      items: [
        { label: 'Net worth', icon: TrendingUp, to: '/net-worth' },
        { label: 'Household', icon: Home, to: '/household' },
        { label: 'AI Advisor', icon: Sparkles, to: '/advisor', accent: true },
      ],
    },
  ],
  business: [
    {
      label: 'Business',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, to: '/business', end: true },
        { label: 'Invoices', icon: FileText, to: '/business/invoices' },
        { label: 'Expenses', icon: Receipt, to: '/business/expenses' },
        { label: 'Tax & ALV', icon: Percent, to: '/business/tax' },
        { label: 'Clients', icon: Users, to: '/business/clients' },
      ],
    },
    {
      label: 'Personal',
      items: [
        { label: 'Transactions', icon: ArrowLeftRight, to: '/transactions' },
        { label: 'Budgets', icon: Target, to: '/budgets' },
      ],
    },
    {
      label: 'Advisor',
      items: [{ label: 'AI Advisor', icon: Sparkles, to: '/advisor', accent: true }],
    },
  ],
  investment: [
    {
      label: 'Invest',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, to: '/investment', end: true },
        { label: 'Portfolio', icon: PieChart, to: '/investment/portfolio' },
        { label: 'Watchlist', icon: Eye, to: '/investment/watchlist' },
      ],
    },
    {
      label: 'Manage',
      items: [
        { label: 'Transactions', icon: ArrowLeftRight, to: '/transactions' },
        { label: 'Budgets', icon: Target, to: '/budgets' },
        { label: 'Net worth', icon: TrendingUp, to: '/net-worth' },
      ],
    },
    {
      label: 'Advisor',
      items: [{ label: 'AI Advisor', icon: Sparkles, to: '/advisor', accent: true }],
    },
  ],
}

// ── Nav item ──────────────────────────────────────────────────────────────────

function SidebarNavItem({
  item,
  collapsed,
  touch = false,
}: {
  item: NavItem
  collapsed: boolean
  /** Touch tablet: taller (48px) hit areas than desktop's 36px. */
  touch?: boolean
}) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center rounded-md text-[13px] font-medium',
          touch ? 'h-12 px-2.5' : 'h-9 px-2',
          collapsed ? 'justify-center' : 'gap-3',
          isActive
            ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
            : item.accent
              ? 'text-[var(--color-accent)] hover:bg-bg-elevated'
              : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
        )
      }
      style={({ isActive }) => ({
        borderLeft: `2px solid ${isActive ? 'var(--color-accent)' : 'transparent'}`,
        transition: 'var(--transition-fast)',
        transitionProperty: 'background-color, color, border-color',
      })}
    >
      <item.icon
        className={cn('flex-shrink-0', item.accent ? 'h-5 w-5' : 'h-[18px] w-[18px]')}
      />
      {!collapsed && (
        <span className="truncate">{item.label}</span>
      )}

      {/* Tooltip — collapsed only */}
      {collapsed && (
        <span
          className="pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-bg-elevated px-2 py-1 text-[12px] font-medium text-text-primary opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
          style={{ left: 68 }}
        >
          {item.label}
        </span>
      )}
    </NavLink>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  /** Render in mobile-drawer mode: always expanded, no collapse toggle. */
  mobile?: boolean
  /** Force the collapsed icon rail (tablet portrait), ignoring stored state. */
  forceCollapsed?: boolean
  /** Touch tablet: wider rail (72px) + 48px nav rows. */
  touch?: boolean
}

export function Sidebar({ mobile = false, forceCollapsed, touch = false }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebar, mode } = useAppStore()
  const navigate = useNavigate()

  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const { plan, isPremium } = usePlan()

  const displayName = profile?.full_name ?? user?.email ?? 'You'
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email
      ? user.email[0].toUpperCase()
      : 'Y'

  const collapsed = mobile ? false : (forceCollapsed ?? sidebarCollapsed)

  return (
    <aside
      style={{
        width: mobile ? '100%' : collapsed ? (touch ? 72 : 60) : 240,
        transition: 'width var(--transition-base)',
      }}
      className={cn(
        'flex flex-col bg-bg-secondary overflow-hidden flex-shrink-0',
        mobile ? 'w-full' : 'h-full border-r border-[var(--border-subtle)]'
      )}
    >
      {/* Header ───────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center h-[60px] flex-shrink-0 border-b border-[var(--border-subtle)]',
          collapsed ? 'justify-center px-0' : 'justify-between px-3'
        )}
      >
        {collapsed ? (
          <button
            onClick={toggleSidebar}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-bg-elevated"
            style={{ transition: 'var(--transition-fast)' }}
          >
            <ValletyMark size={24} />
          </button>
        ) : (
          <>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-left"
              aria-label="Go to dashboard"
            >
              <ValletyMark size={24} />
              <span className="text-[14px] font-medium text-text-primary">
                vallety
              </span>
            </button>

            {!mobile && (
              <button
                onClick={toggleSidebar}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                style={{ transition: 'var(--transition-fast)' }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Mode switching now lives in Profile & settings → Workspace mode, so
          it no longer takes up nav chrome here. */}

      {/* Navigation (keyed by mode so items animate in on switch) ─────────── */}
      <nav
        key={mode}
        className="nav-swap flex-1 overflow-y-auto overflow-x-hidden px-2 py-3"
        aria-label="Main navigation"
      >
        {MODE_NAV[mode].map((group, i) => (
          <div key={group.label} className={cn(i > 0 && 'mt-4')}>
            {!collapsed && (
              <p
                className="px-2 pb-1.5 text-[10px] font-medium uppercase text-text-muted"
                style={{ letterSpacing: '0.08em' }}
              >
                {group.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <SidebarNavItem key={item.to} item={item} collapsed={collapsed} touch={touch} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom / account ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-[var(--border-subtle)] p-2">
        {collapsed ? (
          <NavLink
            to="/profile"
            title="Profile & settings"
            aria-label="Profile & settings"
            className="group relative mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-bg-elevated text-[12px] font-semibold text-[var(--color-accent)]"
          >
            {initials}
            <span
              className="pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-bg-elevated px-2 py-1 text-[12px] font-medium text-text-primary opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
              style={{ left: 68 }}
            >
              Profile &amp; settings
            </span>
          </NavLink>
        ) : (
          <div className="flex items-center gap-2.5 px-1 py-1">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              aria-label="Open profile & settings"
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md text-left hover:bg-bg-elevated"
              style={{ transition: 'var(--transition-fast)' }}
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-bg-elevated text-[12px] font-semibold text-[var(--color-accent)]">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium leading-tight text-text-primary">
                  {displayName}
                </p>
                <span className="mt-0.5 inline-flex items-center gap-1 leading-none">
                  {isPremium
                    ? <PremiumBadge tier={plan} />
                    : <span className="rounded-full bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-muted">{planLabel(plan)}</span>}
                </span>
              </div>
            </button>
            <NavLink
              to="/profile"
              title="Profile & settings"
              aria-label="Profile & settings"
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
              style={{ transition: 'var(--transition-fast)' }}
            >
              <Settings className="h-4 w-4" />
            </NavLink>
          </div>
        )}
        {/* Version — single source of truth (shared/lib/version.ts) */}
        {!collapsed && (
          <p className="px-1 pt-1.5 text-[10px] text-text-muted">Vallety {APP_VERSION_LABEL}</p>
        )}
      </div>

      {/* Expand affordance when collapsed (desktop) ───────────────────────── */}
      {!mobile && collapsed && (
        <button
          onClick={toggleSidebar}
          title="Expand sidebar"
          aria-label="Expand sidebar"
          className="flex h-9 flex-shrink-0 items-center justify-center border-t border-[var(--border-subtle)] text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
          style={{ transition: 'var(--transition-fast)' }}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </aside>
  )
}
