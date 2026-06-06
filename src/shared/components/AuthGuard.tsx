import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { FullPageSpinner } from './LoadingSpinner'

export function AuthGuard() {
  const { session, loading, initialized } = useAuthStore()
  const location = useLocation()

  // Show spinner until the initial session check has resolved
  if (!initialized || loading) return <FullPageSpinner />

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
