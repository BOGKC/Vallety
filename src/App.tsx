import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './shared/lib/queryClient'
import { Layout } from './shared/components/Layout'
import { PersonalDashboard } from './modes/personal/PersonalDashboard'
import { BusinessDashboard } from './modes/business/BusinessDashboard'
import { InvestmentDashboard } from './modes/investment/InvestmentDashboard'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/personal" replace />} />
            <Route path="/personal" element={<PersonalDashboard />} />
            <Route path="/business" element={<BusinessDashboard />} />
            <Route path="/investment" element={<InvestmentDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
