import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, User, Settings, Menu } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { useAuth } from '../hooks/useAuth'
import { cn } from '../lib/cn'
import type { AppMode } from '../types'

// ── Mode switcher ─────────────────────────────────────────────────────────────

const MODES: AppMode[] = ['personal', 'business', 'investment']
const MODE_LABELS: Record<AppMode, string> = {
  personal: 'Personal',
  business: 'Business',
  investment: 'Investment',
}
const MODE_ACTIVE_PILL: Record<AppMode, string> = {
  personal:   'bg-brand/15 text-brand ring-1 ring-inset ring-brand/30',
  business:   'bg-business/15 text-business ring-1 ring-inset ring-business/30',
  investment: 'bg-investment/15 text-investment ring-1 ring-inset ring-investment/30',
}
const MODE_ROOTS: Record<AppMode, string> = {
  personal:   '/personal',
  business:   '/business',
  investment: '/investment',
}

function ModeSwitcher() {
  const { mode, setMode } = useAppStore()
  const navigate = useNavigate()

  const handleSwitch = (m: AppMode) => {
    setMode(m)
    navigate(MODE_ROOTS[m])
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-bg-primary rounded-lg">
      {MODES.map((m) => (
        <button
          key={m}
          onClick={() => handleSwitch(m)}
          className={cn(
            'px-3 py-1 rounded-md text-sm font-medium transition-all',
            mode === m
              ? MODE_ACTIVE_PILL[m]
              : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
          )}
        >
          {MODE_LABELS[m]}
        </button>
      ))}
    </div>
  )
}

// ── Notification bell ─────────────────────────────────────────────────────────

function NotificationBell() {
  const { notificationCount } = useAppStore()

  return (
    <button
      className="relative h-9 w-9 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
      aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
    >
      <Bell className="h-5 w-5" />
      {notificationCount > 0 && (
        <span
          className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none"
          aria-hidden
        >
          {notificationCount > 9 ? '9+' : notificationCount}
        </span>
      )}
    </button>
  )
}

// ── Currency badge ────────────────────────────────────────────────────────────

function CurrencyBadge() {
  const profile = useAuthStore((s) => s.profile)
  const currency = profile?.currency ?? 'EUR'

  return (
    <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md bg-bg-primary border border-border text-text-secondary text-xs font-medium tracking-wide">
      {currency}
    </span>
  )
}

// ── User menu ─────────────────────────────────────────────────────────────────

function UserMenu() {
  const profile = useAuthStore((s) => s.profile)
  const user    = useAuthStore((s) => s.user)
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
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

  const displayName = profile?.full_name ?? user?.email ?? 'User'
  const email       = user?.email ?? ''
  const initials    = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0] ?? 'U').toUpperCase()

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    navigate('/login')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-9 px-1.5 rounded-lg hover:bg-white/5 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {/* Avatar circle */}
        <div className="h-7 w-7 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center text-brand text-xs font-semibold flex-shrink-0">
          {initials}
        </div>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-text-secondary transition-transform duration-150',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-bg-card border border-border shadow-xl z-50 py-1.5 overflow-hidden"
          role="menu"
        >
          {/* User info header */}
          <div className="px-3 py-2.5 border-b border-border mb-1">
            <p className="text-text-primary text-sm font-medium leading-tight truncate">
              {displayName}
            </p>
            <p className="text-text-secondary text-xs truncate mt-0.5">{email}</p>
          </div>

          <button
            onClick={() => { navigate('/settings/profile'); setOpen(false) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
            role="menuitem"
          >
            <User className="h-4 w-4" />
            Profile
          </button>

          <button
            onClick={() => { navigate('/settings'); setOpen(false) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
            role="menuitem"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>

          <div className="my-1 border-t border-border" />

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
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
  return (
    <header className="h-14 flex items-center justify-between gap-4 px-4 bg-bg-secondary border-b border-border flex-shrink-0 z-10">
      {/* Left: hamburger (mobile) */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors flex-shrink-0"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Mode switcher (center-ish, hidden on very small screens) */}
        <div className="hidden sm:block">
          <ModeSwitcher />
        </div>
      </div>

      {/* Right: currency + bell + user */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <CurrencyBadge />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}
