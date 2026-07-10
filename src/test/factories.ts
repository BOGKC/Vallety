// Test data factories — realistic defaults, override any field per test.
import type { Txn } from '../shared/lib/transactions'
import type { Invoice, BusinessExpense } from '../shared/lib/business'
import type { Holding } from '../shared/lib/portfolio'
import type { Account } from '../shared/lib/netWorth'
import type { Budget } from '../shared/lib/budgets'
import type { Goal } from '../shared/lib/goals'

let seq = 0
const id = (p: string) => `${p}_${(seq += 1)}`

export const makeTxn = (o: Partial<Txn> = {}): Txn => ({
  id: id('txn'),
  type: 'expense',
  amount: 20,
  merchant: 'Test Merchant',
  category: 'Groceries',
  date: '2026-06-15T10:00:00.000Z',
  ...o,
})

export const makeInvoice = (o: Partial<Invoice> = {}): Invoice => ({
  id: id('inv'),
  client: 'Acme Oy',
  description: 'Consulting',
  amount: 1000,
  vatRate: 25.5,
  status: 'paid',
  issuedAt: '2026-06-01T00:00:00.000Z',
  dueDate: '2026-06-15T00:00:00.000Z',
  paidAt: '2026-06-10T00:00:00.000Z',
  createdAt: '2026-06-01T00:00:00.000Z',
  ...o,
})

export const makeExpense = (o: Partial<BusinessExpense> = {}): BusinessExpense => ({
  id: id('exp'),
  vendor: 'AWS',
  amount: 100,
  vatRate: 25.5,
  category: 'Software & tools',
  date: '2026-06-05T00:00:00.000Z',
  createdAt: '2026-06-05T00:00:00.000Z',
  ...o,
})

export const makeHolding = (o: Partial<Holding> = {}): Holding => ({
  id: id('hold'),
  ticker: 'NDA',
  name: 'Nordea',
  type: 'stock',
  quantity: 10,
  avgCost: 10,
  currentPrice: 12,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...o,
})

export const makeAccount = (o: Partial<Account> = {}): Account => ({
  id: id('acc'),
  name: 'Checking',
  type: 'checking',
  balance: 5000,
  currency: 'EUR',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...o,
})

export const makeBudget = (o: Partial<Budget> = {}): Budget => ({
  id: id('bud'),
  category: 'Groceries',
  amount: 400,
  period: 'monthly',
  createdAt: '2026-06-01T00:00:00.000Z',
  ...o,
})

export const makeGoal = (o: Partial<Goal> = {}): Goal => ({
  id: id('goal'),
  name: 'Emergency fund',
  target: 10000,
  saved: 2500,
  targetDate: '',
  category: 'Other',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...o,
})
