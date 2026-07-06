import type { AppMode } from '../types'

export const ACTIVE_MODE_KEY = 'vallety_active_mode'

/**
 * Per-mode accent palettes. These drive the `--color-accent*` family of CSS
 * variables, so the entire UI — buttons, nav, focus rings, glows, charts —
 * re-themes when the active mode changes. The variables are registered via
 * @property in index.css with a 400ms transition, so the swap crossfades.
 */
export const MODE_COLORS: Record<
  AppMode,
  {
    accent: string
    accentHover: string
    accentMuted: string
    borderAccent: string
    glow: string
    /** Gradient endpoints for .btn-accent */
    g500: string
    g600: string
  }
> = {
  personal: {
    accent: '#3B5BDB',
    accentHover: '#6C8AF0',
    accentMuted: 'rgba(59, 91, 219, 0.12)',
    borderAccent: 'rgba(59, 91, 219, 0.45)',
    glow: 'rgba(59, 91, 219, 0.35)',
    g500: '#3B5BDB',
    g600: '#2F49B0',
  },
  business: {
    accent: '#0F9D7A',
    accentHover: '#5DCAA5',
    accentMuted: 'rgba(15, 157, 122, 0.12)',
    borderAccent: 'rgba(15, 157, 122, 0.45)',
    glow: 'rgba(15, 157, 122, 0.35)',
    g500: '#0F9D7A',
    g600: '#0C7D61',
  },
  investment: {
    accent: '#9333EA',
    accentHover: '#C4B5FD',
    accentMuted: 'rgba(147, 51, 234, 0.12)',
    borderAccent: 'rgba(147, 51, 234, 0.45)',
    glow: 'rgba(147, 51, 234, 0.35)',
    g500: '#9333EA',
    g600: '#7522BC',
  },
}

/** Apply a mode's full accent ramp to the document root. */
export function setModeAccent(mode: AppMode): void {
  const c = MODE_COLORS[mode]
  if (!c || typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--color-accent', c.accent)
  root.style.setProperty('--color-accent-hover', c.accentHover)
  root.style.setProperty('--color-accent-muted', c.accentMuted)
  root.style.setProperty('--border-accent', c.borderAccent)
  root.style.setProperty('--accent-glow', c.glow)
  root.style.setProperty('--accent-500', c.g500)
  root.style.setProperty('--accent-600', c.g600)
}
