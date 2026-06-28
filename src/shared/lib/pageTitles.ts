// Single source of truth for route → human page title. Used by the TopBar
// (in-app heading) and AppShell (browser document.title).

export const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/budgets': 'Budgets',
  '/bills': 'Bills & schedules',
  '/subscriptions': 'Subscriptions',
  '/personal/subscriptions': 'Subscriptions',
  '/household': 'Household',
  '/personal/household': 'Household',
  '/scenarios': 'Scenarios',
  '/personal/scenarios': 'Scenarios',
  '/net-worth': 'Net Worth',
  '/advisor': 'AI Advisor',
  '/settings': 'Settings',
  '/settings/profile': 'Profile',
  // Legacy mode-prefixed routes
  '/personal': 'Dashboard',
  '/personal/transactions': 'Transactions',
  '/personal/budgets': 'Budgets',
  '/personal/goals': 'Goals',
  '/personal/bills': 'Bills & schedules',
  '/personal/debts': 'Debts',
  '/personal/net-worth': 'Net Worth',
  '/business': 'Dashboard',
  '/business/clients': 'Clients',
  '/business/invoices': 'Invoices',
  '/business/expenses': 'Expenses',
  '/business/mileage': 'Mileage',
  '/business/tax': 'Tax',
  '/investment': 'Dashboard',
  '/investment/portfolio': 'Portfolio',
  '/investment/transactions': 'Transactions',
  '/investment/watchlist': 'Watchlist',
}

export function resolvePageTitle(pathname: string): string {
  const exact = PAGE_TITLES[pathname]
  if (exact) return exact
  // Fallback: title-case the last non-empty path segment
  const segment = pathname.split('/').filter(Boolean).pop() ?? ''
  if (!segment) return 'Dashboard'
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
