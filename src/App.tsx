// Vallety MVP v1.0 — 2026-06-28
// All 14 known bugs resolved. All pages render content. Ready for user testing.
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ToastViewport } from './components/Toast'
import { AppLoader } from './components/AppLoader'
import { PWAManager } from './components/PWAManager'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NotFoundPage } from './components/errors/NotFoundPage'
import { queryClient } from './shared/lib/queryClient'
import { AuthGuard } from './shared/components/AuthGuard'
import { AppShell } from './shared/components/AppShell'
import { ComingSoon } from './shared/components/ComingSoon'
import { FullPageSpinner } from './shared/components/LoadingSpinner'
import { UpgradeModalProvider } from './components/premium/UpgradeModalProvider'
import { useAuth } from './shared/hooks/useAuth'

// Auth pages load eagerly — they're the first thing an unauthed visitor needs.
import { SignupPage } from './pages/auth/SignupPage'
import { LoginPage } from './pages/auth/LoginPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { OnboardingPage } from './pages/auth/OnboardingPage'

// In-app pages are code-split so each loads on demand — keeps the initial
// bundle lean (recharts, drawers, etc. only ship when their page is visited).
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const PersonalDashboard = lazy(() => import('./modes/personal/PersonalDashboard').then((m) => ({ default: m.PersonalDashboard })))
const TransactionsPage = lazy(() => import('./modes/personal/TransactionsPage').then((m) => ({ default: m.TransactionsPage })))
const BudgetsPage = lazy(() => import('./modes/personal/BudgetsPage').then((m) => ({ default: m.BudgetsPage })))
const BillsPage = lazy(() => import('./modes/personal/BillsPage').then((m) => ({ default: m.BillsPage })))
const SubscriptionsPage = lazy(() => import('./modes/personal/SubscriptionsPage').then((m) => ({ default: m.SubscriptionsPage })))
const NetWorthPage = lazy(() => import('./modes/personal/NetWorthPage').then((m) => ({ default: m.NetWorthPage })))
const HouseholdPage = lazy(() => import('./modes/personal/HouseholdPage').then((m) => ({ default: m.HouseholdPage })))
const AdvisorPage = lazy(() => import('./modes/personal/AdvisorPage').then((m) => ({ default: m.AdvisorPage })))
const ScenariosPage = lazy(() => import('./modes/personal/ScenariosPage').then((m) => ({ default: m.ScenariosPage })))
const BusinessDashboard = lazy(() => import('./modes/business/BusinessDashboard').then((m) => ({ default: m.BusinessDashboard })))
const InvoicesPage = lazy(() => import('./modes/business/InvoicesPage').then((m) => ({ default: m.InvoicesPage })))
const ExpensesPage = lazy(() => import('./modes/business/ExpensesPage').then((m) => ({ default: m.ExpensesPage })))
const TaxPage = lazy(() => import('./modes/business/TaxPage').then((m) => ({ default: m.TaxPage })))
const ClientsPage = lazy(() => import('./modes/business/ClientsPage').then((m) => ({ default: m.ClientsPage })))
const InvestmentDashboard = lazy(() => import('./modes/investment/InvestmentDashboard').then((m) => ({ default: m.InvestmentDashboard })))
const PortfolioPage = lazy(() => import('./modes/investment/PortfolioPage').then((m) => ({ default: m.PortfolioPage })))
const WatchlistPage = lazy(() => import('./modes/investment/WatchlistPage').then((m) => ({ default: m.WatchlistPage })))
const PricingPage = lazy(() => import('./pages/PricingPage').then((m) => ({ default: m.PricingPage })))

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
          <UpgradeModalProvider>
          <ErrorBoundary>
          <Suspense fallback={<FullPageSpinner />}>
          <Routes>
            {/* ── Public routes ──────────────────────────────────────────── */}
            <Route path="/signup"         element={<SignupPage />} />
            <Route path="/login"          element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/onboarding"     element={<OnboardingPage />} />

            {/* ── Protected routes (AuthGuard → AppShell) ────────────────── */}
            <Route element={<AuthGuard />}>
              <Route element={<AppShell />}>

                {/* Dashboard renders at "/" directly so the Dashboard nav link
                    (to="/") shows the correct active state. /personal remains an
                    alias below for legacy links. */}
                <Route index element={<PersonalDashboard />} />

                {/* Flat routes (new IA) ───────────────────────────────────── */}
                <Route path="/transactions"            element={<TransactionsPage />} />
                <Route path="/budgets"                 element={<BudgetsPage />} />
                <Route path="/bills"                   element={<BillsPage />} />
                <Route path="/subscriptions"           element={<SubscriptionsPage />} />
                <Route path="/personal/subscriptions"  element={<SubscriptionsPage />} />
                <Route path="/net-worth"               element={<NetWorthPage />} />
                <Route path="/household"               element={<HouseholdPage />} />
                <Route path="/personal/household"      element={<HouseholdPage />} />
                <Route path="/scenarios"               element={<ScenariosPage />} />
                <Route path="/personal/scenarios"      element={<ScenariosPage />} />

                {/* Personal ───────────────────────────────────────────────── */}
                <Route path="/personal"                element={<PersonalDashboard />} />
                <Route path="/personal/transactions"   element={<TransactionsPage />} />
                <Route path="/personal/budgets"        element={<BudgetsPage />} />
                <Route path="/personal/goals"          element={<ComingSoon title="Goals" />} />
                <Route path="/personal/bills"          element={<BillsPage />} />
                <Route path="/personal/debts"          element={<ComingSoon title="Debts" />} />
                <Route path="/personal/net-worth"      element={<NetWorthPage />} />

                {/* Business (Solo founder) ────────────────────────────────── */}
                <Route path="/business"                element={<BusinessDashboard />} />
                <Route path="/business/clients"        element={<ClientsPage />} />
                <Route path="/business/invoices"       element={<InvoicesPage />} />
                <Route path="/business/expenses"       element={<ExpensesPage />} />
                <Route path="/business/mileage"        element={<ComingSoon title="Mileage Log" />} />
                <Route path="/business/tax"            element={<TaxPage />} />

                {/* Investment ─────────────────────────────────────────────── */}
                <Route path="/investment"              element={<InvestmentDashboard />} />
                <Route path="/investment/portfolio"    element={<PortfolioPage />} />
                <Route path="/investment/transactions" element={<Navigate to="/transactions" replace />} />
                <Route path="/investment/watchlist"    element={<WatchlistPage />} />

                {/* Shared ─────────────────────────────────────────────────── */}
                <Route path="/profile"                 element={<ProfilePage />} />
                <Route path="/settings"                element={<Navigate to="/profile" replace />} />
                <Route path="/settings/profile"        element={<Navigate to="/profile" replace />} />
                <Route path="/advisor"                 element={<AdvisorPage />} />
                <Route path="/pricing"                 element={<PricingPage />} />

              </Route>
            </Route>

            {/* ── Catch-all: friendly 404 (dashboard link re-runs AuthGuard) ─ */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>

          {/* Branded splash over everything until the session check resolves */}
          <AppLoader />

          {/* Service-worker update prompt (toast + Refresh) */}
          <PWAManager />

          <ToastViewport />
          </UpgradeModalProvider>
        </AuthInit>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
