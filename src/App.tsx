import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { queryClient } from './shared/lib/queryClient'
import { AuthGuard } from './shared/components/AuthGuard'
import { AppShell } from './shared/components/AppShell'
import { ComingSoon } from './shared/components/ComingSoon'
import { useAuth } from './shared/hooks/useAuth'
import { SignupPage } from './pages/auth/SignupPage'
import { LoginPage } from './pages/auth/LoginPage'
import { OnboardingPage } from './pages/auth/OnboardingPage'
import { PersonalDashboard } from './modes/personal/PersonalDashboard'
import { TransactionsPage } from './modes/personal/TransactionsPage'
import { BudgetsPage } from './modes/personal/BudgetsPage'
import { BillsPage } from './modes/personal/BillsPage'
import { SubscriptionsPage } from './modes/personal/SubscriptionsPage'
import { NetWorthPage } from './modes/personal/NetWorthPage'
import { HouseholdPage } from './modes/personal/HouseholdPage'
import { AdvisorPage } from './modes/personal/AdvisorPage'
import { BusinessDashboard } from './modes/business/BusinessDashboard'
import { InvestmentDashboard } from './modes/investment/InvestmentDashboard'

// Initialises the Supabase auth listener once for the whole app.
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
            {/* ── Public routes ──────────────────────────────────────────── */}
            <Route path="/signup"     element={<SignupPage />} />
            <Route path="/login"      element={<LoginPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* ── Protected routes (AuthGuard → AppShell) ────────────────── */}
            <Route element={<AuthGuard />}>
              <Route element={<AppShell />}>

                <Route index element={<Navigate to="/personal" replace />} />

                {/* Flat routes (new IA) ───────────────────────────────────── */}
                <Route path="/transactions"            element={<TransactionsPage />} />
                <Route path="/budgets"                 element={<BudgetsPage />} />
                <Route path="/bills"                   element={<BillsPage />} />
                <Route path="/subscriptions"           element={<SubscriptionsPage />} />
                <Route path="/personal/subscriptions"  element={<SubscriptionsPage />} />
                <Route path="/net-worth"               element={<NetWorthPage />} />
                <Route path="/household"               element={<HouseholdPage />} />
                <Route path="/personal/household"      element={<HouseholdPage />} />

                {/* Personal ───────────────────────────────────────────────── */}
                <Route path="/personal"                element={<PersonalDashboard />} />
                <Route path="/personal/transactions"   element={<TransactionsPage />} />
                <Route path="/personal/budgets"        element={<BudgetsPage />} />
                <Route path="/personal/goals"          element={<ComingSoon title="Goals" />} />
                <Route path="/personal/bills"          element={<BillsPage />} />
                <Route path="/personal/debts"          element={<ComingSoon title="Debts" />} />
                <Route path="/personal/net-worth"      element={<NetWorthPage />} />

                {/* Business ───────────────────────────────────────────────── */}
                <Route path="/business"                element={<BusinessDashboard />} />
                <Route path="/business/clients"        element={<ComingSoon title="Clients" />} />
                <Route path="/business/invoices"       element={<ComingSoon title="Invoices" />} />
                <Route path="/business/expenses"       element={<ComingSoon title="Expenses" />} />
                <Route path="/business/mileage"        element={<ComingSoon title="Mileage Log" />} />
                <Route path="/business/tax"            element={<ComingSoon title="Tax" />} />

                {/* Investment ─────────────────────────────────────────────── */}
                <Route path="/investment"              element={<InvestmentDashboard />} />
                <Route path="/investment/portfolio"    element={<ComingSoon title="Portfolio" />} />
                <Route path="/investment/transactions" element={<ComingSoon title="Investment Transactions" />} />
                <Route path="/investment/watchlist"    element={<ComingSoon title="Watchlist" />} />

                {/* Shared ─────────────────────────────────────────────────── */}
                <Route path="/settings"                element={<ComingSoon title="Settings" />} />
                <Route path="/settings/profile"        element={<ComingSoon title="Profile" />} />
                <Route path="/advisor"                 element={<AdvisorPage />} />

              </Route>
            </Route>

            {/* ── Catch-all ──────────────────────────────────────────────── */}
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
              error:   { iconTheme: { primary: '#f87171', secondary: '#fff' } },
            }}
          />
        </AuthInit>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
