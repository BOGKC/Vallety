import { useEffect, useCallback } from 'react'
import { supabase } from '../../supabase/client'
import { useAuthStore } from '../store/authStore'
import { useAppStore } from '../store/appStore'
import { authCallbackUrl } from '../lib/authRedirect'
import { clearAllValletyKeys, ensureLocalDataOwner, purgeDataCaches } from '../lib/profile'
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
      if (session?.user) {
        // Wipe stale local data if it belonged to a different user (shared device).
        ensureLocalDataOwner(session.user.id)
        const profile = await fetchProfile(session.user.id)
        store().setProfile(profile)
        // One-time on initial load: adopt the saved workspace mode so the
        // preference follows the user to a new device. (Deliberately not done
        // in onAuthStateChange to avoid a token refresh reverting a just-made
        // local mode switch.)
        if (profile?.active_mode) useAppStore.getState().setMode(profile.active_mode)
      }
    }).catch((e) => {
      // If getSession() (or the profile fetch) rejects, we must still finish
      // bootstrapping — otherwise AuthGuard/AppLoader spin forever on a blank
      // screen. Treat it as "signed out": the user lands on the login screen
      // (a recoverable state) rather than a permanent spinner.
      console.error('[auth] bootstrap failed; continuing signed-out:', e)
      store().setSession(null)
    }).finally(() => {
      store().setLoading(false)
      store().setInitialized(true)
    })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      store().setSession(session)
      if (session?.user) {
        ensureLocalDataOwner(session.user.id)
        store().setProfile(await fetchProfile(session.user.id))
      }
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

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    // Local-first data lives in localStorage under global (non-user-scoped)
    // keys, so on a shared device it would otherwise be visible to the next
    // person who signs in. Clear all app data on logout so nothing leaks
    // across accounts / to the next user. (Users can back up via the GDPR
    // JSON export before logging out.)
    clearAllValletyKeys()
    void purgeDataCaches() // also drop cached Supabase REST/Storage responses
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
    signOut,
    refreshProfile,
  }
}
