import { NavLink } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { MODE_LABELS } from '../lib/constants'
import type { AppMode } from '../types'

const MODES: AppMode[] = ['personal', 'business', 'investment']

const MODE_ACTIVE_CLASSES: Record<AppMode, string> = {
  personal: 'text-brand border-brand',
  business: 'text-business border-business',
  investment: 'text-investment border-investment',
}

export function NavBar() {
  const { mode, setMode } = useAppStore()

  return (
    <nav className="bg-bg-secondary border-b border-border px-4 py-3 flex items-center justify-between">
      <span className="text-text-primary font-semibold text-lg tracking-tight">Vallety</span>
      <div className="flex gap-1">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded text-sm font-medium border transition-colors ${
              mode === m
                ? `${MODE_ACTIVE_CLASSES[m]} bg-bg-card`
                : 'text-text-secondary border-transparent hover:text-text-primary'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `text-sm ${isActive ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`
        }
      >
        Settings
      </NavLink>
    </nav>
  )
}
