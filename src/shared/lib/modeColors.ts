import type { AppMode } from '../types'

/**
 * Per-mode accent palettes. These drive the `--color-accent*` CSS variables
 * so the entire UI re-themes when the active mode changes.
 */
export const MODE_COLORS: Record<
  AppMode,
  { accent: string; accentHover: string; accentMuted: string }
> = {
  personal: {
    accent: '#3B5BDB',
    accentHover: '#4C6EF5',
    accentMuted: 'rgba(59,91,219,0.12)',
  },
  business: {
    accent: '#0F9D7A',
    accentHover: '#10B981',
    accentMuted: 'rgba(15,157,122,0.12)',
  },
  investment: {
    accent: '#9333EA',
    accentHover: '#A855F7',
    accentMuted: 'rgba(147,51,234,0.12)',
  },
}

/**
 * Applies a mode's accent palette to the document root by updating the
 * `--color-accent`, `--color-accent-hover` and `--color-accent-muted`
 * CSS variables.
 */
export function setModeAccent(mode: AppMode): void {
  const colors = MODE_COLORS[mode]
  if (!colors) return

  const root = document.documentElement
  root.style.setProperty('--color-accent', colors.accent)
  root.style.setProperty('--color-accent-hover', colors.accentHover)
  root.style.setProperty('--color-accent-muted', colors.accentMuted)
}
