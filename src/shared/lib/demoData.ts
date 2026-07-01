import { subMonths, setDate, addDays, addMonths, format } from 'date-fns'
import { TRANSACTIONS_KEY, type Txn } from './transactions'
import { BUDGETS_KEY, type Budget } from './budgets'
import { GOALS_KEY, type Goal } from './goals'
import { BILLS_KEY, type Bill } from './bills'
import { ACCOUNTS_KEY, SNAPSHOTS_KEY, type Account, type Snapshot } from './netWorth'

/**
 * Public demo credentials for the "Try the demo" button on the login page.
 * Intentionally committed and public — this account exists ONLY for trials.
 * Never attach real data or privileges to it. App data is device-local
 * (localStorage), so every trial visitor gets their own sandbox regardless.
 */
export const DEMO_EMAIL = 'demo@vallety.app'
export const DEMO_PASSWORD = 'Vallety-Demo-2026!'

const iso = (d: Date) => d.toISOString()

function writeIfEmpty(key: string, value: unknown): void {
  try {
    const existing = window.localStorage.getItem(key)
    // Respect anything the visitor already has — never clobber real data.
    if (existing && existing !== '[]') return
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

/**
 * Seed a realistic three-month sandbox (transactions, budgets, goals, bills,
 * accounts, net-worth history) so the trial shows a living app rather than a
 * wall of empty states. Each collection is only written if currently empty.
 */
export function seedDemoData(now = new Date()): void {
  let n = 0
  const id = (p: string) => `demo_${p}_${(n += 1)}`

  // ── Transactions: salary + groceries/dining/transport + recurring
  //    subscription charges (3× at a stable amount so auto-detection fires).
  const txns: Txn[] = []
  for (let m = 2; m >= 0; m--) {
    const month = subMonths(now, m)
    const day = (d: number) => setDate(month, d)
    txns.push(
      { id: id('t'), type: 'income', amount: 3200, merchant: 'Acme Oy — Salary', category: 'Income', date: iso(day(1)), account: 'Checking' },
      { id: id('t'), type: 'expense', amount: 72.4, merchant: 'K-Market', category: 'Groceries', date: iso(day(3)) },
      { id: id('t'), type: 'expense', amount: 46.1, merchant: 'Prisma', category: 'Groceries', date: iso(day(9)) },
      { id: id('t'), type: 'expense', amount: 58.9, merchant: 'Lidl', category: 'Groceries', date: iso(day(17)) },
      { id: id('t'), type: 'expense', amount: 34.5, merchant: 'Ravintola Kolme Kruunua', category: 'Dining', date: iso(day(6)) },
      { id: id('t'), type: 'expense', amount: 21.8, merchant: 'Espresso House', category: 'Dining', date: iso(day(13)) },
      { id: id('t'), type: 'expense', amount: 35.2, merchant: 'HSL', category: 'Transport', date: iso(day(2)) },
      { id: id('t'), type: 'expense', amount: 12.99, merchant: 'Netflix', category: 'Entertainment', date: iso(day(15)) },
      { id: id('t'), type: 'expense', amount: 9.99, merchant: 'Spotify', category: 'Entertainment', date: iso(day(20)) },
    )
    if (m > 0) {
      txns.push(
        { id: id('t'), type: 'expense', amount: 89.0, merchant: 'Verkkokauppa.com', category: 'Shopping', date: iso(day(22)) },
        { id: id('t'), type: 'expense', amount: 64.3, merchant: 'Helen Oy', category: 'Utilities', date: iso(day(27)) },
      )
    }
  }

  // ── Budgets
  const createdAt = iso(subMonths(now, 2))
  const budgets: Budget[] = [
    { id: id('b'), category: 'Groceries', amount: 400, period: 'monthly', color: '#22C55E', createdAt },
    { id: id('b'), category: 'Dining', amount: 150, period: 'monthly', color: '#F59E0B', createdAt },
    { id: id('b'), category: 'Transport', amount: 100, period: 'monthly', color: '#3B5BDB', createdAt },
    { id: id('b'), category: 'Entertainment', amount: 80, period: 'monthly', color: '#9333EA', createdAt },
  ]

  // ── Goals
  const goals: Goal[] = [
    { id: id('g'), name: 'Emergency fund', target: 5000, saved: 2600, targetDate: iso(addMonths(now, 8)), category: 'Other', createdAt },
    { id: id('g'), name: 'Trip to Japan', target: 2500, saved: 800, targetDate: iso(addMonths(now, 12)), category: 'Travel', createdAt },
  ]

  // ── Bills (a couple due inside the next 7 days so the dashboard strip shows)
  const bills: Bill[] = [
    { id: id('bl'), name: 'Rent', amount: 950, frequency: 'monthly', nextDue: iso(addDays(now, 4)), category: 'Housing', paidMonths: [], createdAt },
    { id: id('bl'), name: 'Gym membership', amount: 39, frequency: 'monthly', nextDue: iso(addDays(now, 6)), category: 'Bills', paidMonths: [], createdAt },
    { id: id('bl'), name: 'Electricity — Helen', amount: 65, frequency: 'monthly', nextDue: iso(addDays(now, 12)), category: 'Utilities', paidMonths: [], createdAt },
    { id: id('bl'), name: 'Home insurance', amount: 210, frequency: 'quarterly', nextDue: iso(addDays(now, 20)), category: 'Housing', paidMonths: [], createdAt },
  ]

  // ── Net worth: accounts + a few months of history (the current month's
  //    snapshot is appended automatically by ensureMonthlySnapshot()).
  const accounts: Account[] = [
    { id: id('a'), name: 'Everyday account', type: 'checking', institution: 'OP', balance: 2340, currency: 'EUR', createdAt },
    { id: id('a'), name: 'Rainy-day savings', type: 'savings', institution: 'Nordea', balance: 8500, currency: 'EUR', createdAt },
    { id: id('a'), name: 'Index funds', type: 'investment', institution: 'Nordnet', balance: 4120, currency: 'EUR', createdAt },
    { id: id('a'), name: 'Student loan', type: 'loan', institution: 'Kela', balance: 6800, currency: 'EUR', createdAt },
  ]
  const snapshots: Snapshot[] = [4, 3, 2, 1].map((m) => {
    const assets = 14960 - m * 420
    const liabilities = 6800 + m * 150
    return {
      date: iso(setDate(subMonths(now, m), 1)),
      totalAssets: assets,
      totalLiabilities: liabilities,
      netWorth: assets - liabilities,
    }
  })

  writeIfEmpty(TRANSACTIONS_KEY, txns)
  writeIfEmpty(BUDGETS_KEY, budgets)
  writeIfEmpty(GOALS_KEY, goals)
  writeIfEmpty(BILLS_KEY, bills)
  writeIfEmpty(ACCOUNTS_KEY, accounts)
  writeIfEmpty(SNAPSHOTS_KEY, snapshots)
  // Remember the demo was seeded (useful for future "reset demo" tooling).
  try {
    window.localStorage.setItem('vallety_demo_seeded', format(now, 'yyyy-MM-dd'))
  } catch {
    /* ignore */
  }
}
