import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'
import { normalizeSupabaseUrl } from './normalizeUrl'
import { authStorage } from '../shared/lib/authPersistence'

const supabaseUrl = normalizeSupabaseUrl(
  import.meta.env.VITE_SUPABASE_URL as string | undefined,
  (pathname, origin) => {
    if (import.meta.env.DEV) {
      console.warn(
        `[supabase] VITE_SUPABASE_URL had a path ("${pathname}"); using origin "${origin}". ` +
        'Set it to just the project URL, e.g. https://<ref>.supabase.co',
      )
    }
  },
)
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // "Remember me" routing: localStorage (persists across restarts) when the
    // preference is set, sessionStorage (cleared on browser close) otherwise.
    storage: authStorage,
  },
})

// Convenience type helpers
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
