import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Strip any trailing slash(es) from the project URL. A trailing slash makes
// supabase-js build request paths like ".../auth/v1//signup" (double slash),
// which GoTrue rejects with "Invalid path specified in request URL". This is
// the usual cause of that error — normalise it defensively regardless of how
// the env var is entered in the dashboard.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/+$/, '') ?? ''
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
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
