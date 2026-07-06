import { useNavigate } from 'react-router-dom'
import toast from '../../components/Toast'
import { useAppStore } from '../store/appStore'
import { cn } from '../lib/cn'
import type { AppMode } from '../types'

const MODES: AppMode[] = ['personal', 'business', 'investment']
const LABELS: Record<AppMode, string> = {
  personal: 'Personal',
  business: 'Solo founder',
  investment: 'Investor',
}
const ROOTS: Record<AppMode, string> = {
  personal: '/',
  business: '/business',
  investment: '/investment',
}
const ACTIVE_PILL: Record<AppMode, string> = {
  personal:   'bg-brand/15 text-brand ring-1 ring-inset ring-brand/30',
  business:   'bg-business/15 text-business ring-1 ring-inset ring-business/30',
  investment: 'bg-investment/15 text-investment ring-1 ring-inset ring-investment/30',
}

interface Props {
  onNavigate?: () => void
}

export function ModeSwitcher({ onNavigate }: Props) {
  const { mode, setMode } = useAppStore()
  const navigate = useNavigate()

  const handleSwitch = (m: AppMode) => {
    if (m !== mode) toast.success(`Switched to ${LABELS[m]} mode`)
    setMode(m)
    navigate(ROOTS[m])
    onNavigate?.()
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-bg-primary rounded-lg w-full">
      {MODES.map((m) => (
        <button
          key={m}
          onClick={() => handleSwitch(m)}
          className={cn(
            'flex-1 py-1.5 rounded-md text-sm font-medium transition-all',
            mode === m
              ? ACTIVE_PILL[m]
              : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
          )}
        >
          {LABELS[m]}
        </button>
      ))}
    </div>
  )
}
