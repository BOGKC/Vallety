// ── Theme (light / dark / system) ─────────────────────────────────────────────
// The whole app themes through CSS variables. This module resolves the user's
// preference to a concrete "light" | "dark", stamps it on <html data-theme>, and
// keeps it in sync with the OS when the preference is "system". Because every
// surface reads CSS variables, flipping data-theme re-skins the app instantly —
// no re-render needed. Canvas-drawn effects subscribe via useResolvedTheme().

import { readProfile, type ValletyProfile } from './profile'

export type ThemePref = ValletyProfile['theme'] // 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'

export const THEME_CHANGED_EVENT = 'vallety:theme-changed'

const THEME_COLOR = { dark: '#0A0E1A', light: '#F4F6FB' }

function systemPrefersLight(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: light)').matches
}

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref === 'system') return systemPrefersLight() ? 'light' : 'dark'
  return pref
}

let stopSystemWatch: (() => void) | null = null

/**
 * Apply a theme preference: set <html data-theme>, the native color-scheme, and
 * the mobile status-bar meta, then (for "system") watch the OS for changes.
 * Fires THEME_CHANGED_EVENT so canvas effects can retune.
 */
export function applyTheme(pref: ThemePref): void {
  if (typeof document === 'undefined') return
  const resolved = resolveTheme(pref)
  const root = document.documentElement
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLOR[resolved])

  stopSystemWatch?.()
  stopSystemWatch = null
  if (pref === 'system') {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    stopSystemWatch = () => mq.removeEventListener('change', onChange)
  }

  window.dispatchEvent(new CustomEvent(THEME_CHANGED_EVENT, { detail: resolved }))
}

/** Apply the stored preference on boot (defaults to dark). */
export function initTheme(): void {
  applyTheme(readProfile().theme ?? 'dark')
}

/** Current resolved theme from the DOM (what's actually painted). */
export function currentResolvedTheme(): ResolvedTheme {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}
