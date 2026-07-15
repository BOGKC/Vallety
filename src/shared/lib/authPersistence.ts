// "Remember me" persistence. Supabase persists the session through a single
// storage adapter chosen at client-creation time, so we install ONE adapter
// that routes to localStorage (remember → survives browser restart) or
// sessionStorage (don't remember → cleared when the browser fully closes),
// based on a preference flag. The flag itself lives in localStorage so it can
// pre-fill the checkbox and be read before the session is restored on load.

export const REMEMBER_KEY = 'vallety_remember'

const hasWindow = typeof window !== 'undefined'

/** Remember-me preference. Default TRUE — most users want to stay logged in. */
export function getRemember(): boolean {
  if (!hasWindow) return true
  try { return window.localStorage.getItem(REMEMBER_KEY) !== '0' } catch { return true }
}

/** Persist the preference (also used to pre-fill the checkbox next visit). */
export function setRemember(remember: boolean): void {
  if (!hasWindow) return
  try { window.localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0') } catch { /* ignore */ }
}

/**
 * Storage adapter for the Supabase auth client. Writes land in the store the
 * current preference selects; reads find the token wherever it lives (so a
 * flag flip never strands a session); removes clear both.
 */
export const authStorage = {
  getItem(key: string): string | null {
    if (!hasWindow) return null
    try {
      const primary = getRemember() ? window.localStorage : window.sessionStorage
      const secondary = getRemember() ? window.sessionStorage : window.localStorage
      return primary.getItem(key) ?? secondary.getItem(key)
    } catch { return null }
  },
  setItem(key: string, value: string): void {
    if (!hasWindow) return
    try {
      const chosen = getRemember() ? window.localStorage : window.sessionStorage
      const other = getRemember() ? window.sessionStorage : window.localStorage
      chosen.setItem(key, value)
      other.removeItem(key) // never leave a stale copy in the other store
    } catch { /* ignore */ }
  },
  removeItem(key: string): void {
    if (!hasWindow) return
    try {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    } catch { /* ignore */ }
  },
}
