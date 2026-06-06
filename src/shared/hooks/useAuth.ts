import { useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const { session, user, setSession } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [setSession])

  return { session, user, isAuthenticated: !!session }
}
