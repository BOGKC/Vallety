import type { AppMode } from '../types'

export const MODE_LABELS: Record<AppMode, string> = {
  personal: 'Personal',
  business: 'Business',
  investment: 'Investment',
}

export const MODE_COLORS: Record<AppMode, string> = {
  personal: 'var(--color-brand)',
  business: 'var(--color-business)',
  investment: 'var(--color-investment)',
}
