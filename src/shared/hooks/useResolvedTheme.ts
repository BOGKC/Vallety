import { useSyncExternalStore } from 'react'
import { THEME_CHANGED_EVENT, currentResolvedTheme, type ResolvedTheme } from '../lib/theme'

// CSS-variable-driven UI re-skins automatically when <html data-theme> flips.
// This hook is for the few JS/canvas effects (background particles) that need to
// read the resolved theme and retune live.
function subscribe(cb: () => void): () => void {
  window.addEventListener(THEME_CHANGED_EVENT, cb)
  return () => window.removeEventListener(THEME_CHANGED_EVENT, cb)
}

export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribe, currentResolvedTheme, () => 'dark')
}
