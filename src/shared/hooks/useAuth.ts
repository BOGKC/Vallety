import { useEffect, useCallback } from 'react'
import { supabase } from '../../supabase/client'
import { useAuthStore } from '../store/authStore'
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

export function useAuth() {
  const {
    session, user, profile, loading,
    setSession, setProfile, setLoading, setInitialized, reset,
  } = useAuthStore()

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return
      setSession(session)
      if (session?.user) {
        const p = await fetchProfile(session.user.id)
        if (!cancelled) setProfile(p)
      }
      setLoading(false)
      setInitialized(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (cancelled) return
        setSession(session)
        if (session?.user) {
          const p = await fetchProfile(session.user.id)
          if (!cancelled) setProfile(p)
        } else {
          setProfile(null)
        }
        setLoading(false)
        setInitialized(true)
      }
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      options: { emailRedirectTo: `${window.location.origin}/login` },
    })
    return { error }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
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
