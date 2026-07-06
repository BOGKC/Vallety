import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, LogOut, User, Settings, Menu } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { useAuth } from '../hooks/useAuth'
import { resolvePageTitle } from '../lib/pageTitles'
import toast from '../../components/Toast'

// ── Page title resolver ─────────────────────────────────────────────────────────

function timeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── Currency pill ───────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', JPY: '¥',
}

function CurrencyPill() {
  const profile = useAuthStore((s) => s.profile)
  const currency = profile?.currency ?? 'EUR'
  const symbol = CURRENCY_SYMBOLS[currency] ?? ''

  // Informational only (the active currency comes from the profile), so this is
  // a non-interactive indicator rather than a button that does nothing.
  return (
    <span
      className="hidden md:inline-flex h-7 items-center rounded-full bg-bg-elevated px-2 text-[12px] font-medium text-text-secondary"
      title={`Currency: ${currency}`}
    >
      {symbol} {currency}
    </span>
  )
}

// ── Notification bell ─────────────────────────────────────────────────────────

function NotificationBell() {
  const { notificationCount } = useAppStore()
  const hasAlerts = notificationCount > 0

  return (
    <button
      onClick={() =>
        toast.info(hasAlerts ? `${notificationCount} unread notifications` : 'No new notifications')
      }
      className="relative flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
      style={{ transition: 'var(--transition-fast)' }}
      aria-label={`Notifications${hasAlerts ? ` (${notificationCount} unread)` : ''}`}
    >
      <Bell className="h-[18px] w-[18px]" />
      {hasAlerts && (
        <span
          className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--color-danger)]"
          aria-hidden
        />
      )}
    </button>
  )
}

// ── Sync indicator ──────────────────────────────────────────────────────────────

function SyncIndicator() {
  return (
    <div
      className="hidden md:flex items-center gap-1.5 px-1.5"
      title="Data is stored locally"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" aria-hidden />
      <span className="text-[12px] text-text-muted">Local</span>
    </div>
  )
}

// ── User menu ─────────────────────────────────────────────────────────────────

function UserMenu() {
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const displayName = profile?.full_name ?? user?.email ?? null
  const email = user?.email ?? ''
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email
      ? user.email[0].toUpperCase()
      : 'V'

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    navigate('/login')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-elevated text-[13px] font-semibold text-[var(--color-accent)]"
        style={{ transition: 'var(--transition-fast)' }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {initials}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-lg border border-default bg-bg-elevated py-1.5 shadow-xl"
          role="menu"
        >
          {displayName && (
            <div className="mb-1 border-b border-subtle px-3 py-2.5">
              <p className="truncate text-[13px] font-medium leading-tight text-text-primary">
                {displayName}
              </p>
              {email && (
                <p className="mt-0.5 truncate text-[11px] text-text-secondary">{email}</p>
              )}
            </div>
          )}

          <button
            onClick={() => { navigate('/profile'); setOpen(false) }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-text-secondary hover:bg-bg-card hover:text-text-primary"
            style={{ transition: 'var(--transition-fast)' }}
            role="menuitem"
          >
            <User className="h-4 w-4" />
            Profile
          </button>

          <button
            onClick={() => { navigate('/profile'); setOpen(false) }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-text-secondary hover:bg-bg-card hover:text-text-primary"
            style={{ transition: 'var(--transition-fast)' }}
            role="menuitem"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>

          <div className="my-1 border-t border-subtle" />

          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--color-danger)] hover:bg-[var(--color-danger-muted)]"
            style={{ transition: 'var(--transition-fast)' }}
            role="menuitem"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

// ── TopBar ────────────────────────────────────────────────────────────────────

interface TopBarProps {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const location = useLocation()
  const title = resolvePageTitle(location.pathname)
  const isDashboard = title === 'Dashboard'

  return (
    <header
      className="sticky top-0 z-40 flex h-14 flex-shrink-0 items-center justify-between gap-4 border-b border-subtle px-4"
      style={{
        backgroundColor: 'rgba(19, 26, 46, 0.8)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      }}
    >
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary md:hidden"
          style={{ transition: 'var(--transition-fast)' }}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        {/* Persistent chrome label, not the page's main heading — each page
            owns its own <h1>, so this stays a non-heading to avoid two h1s. */}
        <span className="truncate text-[16px] font-semibold text-text-primary">{title}</span>
      </div>

      {/* Center: time-based greeting (desktop, dashboard only) */}
      {isDashboard && (
        <div className="hidden flex-1 justify-center md:flex">
          <span className="text-[14px] text-text-secondary">{timeGreeting()}</span>
        </div>
      )}

      {/* Right: currency + bell + sync + avatar */}
      <div className="flex flex-shrink-0 items-center gap-2">
        <CurrencyPill />
        <NotificationBell />
        <SyncIndicator />
        <UserMenu />
      </div>
    </header>
  )
}
