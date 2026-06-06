import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { queryClient } from './shared/lib/queryClient'
import { AuthGuard } from './shared/components/AuthGuard'
import { Layout } from './shared/components/Layout'
import { useAuth } from './shared/hooks/useAuth'
import { SignupPage } from './pages/auth/SignupPage'
import { LoginPage } from './pages/auth/LoginPage'
import { OnboardingPage } from './pages/auth/OnboardingPage'
import { PersonalDashboard } from './modes/personal/PersonalDashboard'
import { BusinessDashboard } from './modes/business/BusinessDashboard'
import { InvestmentDashboard } from './modes/investment/InvestmentDashboard'

// Initialises the Supabase auth listener for the whole app.
function AuthInit({ children }: { children: React.ReactNode }) {
  useAuth()
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInit>
          <Routes>
            {/* Public auth routes */}
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Protected routes */}
            <Route element={<AuthGuard />}>
              <Route element={<Layout />}>
                <Route index element={<Navigate to="/personal" replace />} />
                <Route path="/personal" element={<PersonalDashboard />} />
                <Route path="/business" element={<BusinessDashboard />} />
                <Route path="/investment" element={<InvestmentDashboard />} />
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>

          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#0F9D7A', secondary: '#fff' } },
              error: { iconTheme: { primary: '#f87171', secondary: '#fff' } },
            }}
          />
        </AuthInit>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
