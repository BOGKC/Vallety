import { useEffect, useCallback } from 'react'
import { supabase } from '../../supabase/client'
import { useAuthStore } from '../store/authStore'
import { authCallbackUrl } from '../lib/authRedirect'
import type { Profile } from '../../supabase/types'

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data
}

// The Supabase auth listener is app-wide and must be initialised exactly once,
// no matter how many components call useAuth() (TopBar, AuthGuard, auth pages…).
// A module-level guard prevents duplicate getSession()/onAuthStateChange
// subscriptions and redundant profile fetches. State is written via the store's
// getState() so the long-lived listener never holds a stale closure.
let authBootstrapped = false

export function useAuth() {
  const {
    session, user, profile, loading,
    setProfile, reset,
  } = useAuthStore()

  useEffect(() => {
    if (authBootstrapped) return
    authBootstrapped = true

    const store = useAuthStore.getState

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      store().setSession(session)
      if (session?.user) store().setProfile(await fetchProfile(session.user.id))
      store().setLoading(false)
      store().setInitialized(true)
    })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      store().setSession(session)
      if (session?.user) store().setProfile(await fetchProfile(session.user.id))
      else store().setProfile(null)
      store().setLoading(false)
      store().setInitialized(true)
    })
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error }
    },
    []
  )

  const signInWithMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: authCallbackUrl() },
    })
    return { error }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = authCallbackUrl()
    console.log('[auth] OAuth redirectTo:', redirectTo)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    reset()
  }, [reset])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const p = await fetchProfile(user.id)
    setProfile(p)
  }, [user, setProfile])

  return {
    session,
    user,
    profile,
    loading,
    isAuthenticated: !!session,
    signIn,
    signInWithMagicLink,
    signInWithGoogle,
    signOut,
    refreshProfile,
  }
}
