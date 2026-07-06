import { startOfMonth, endOfMonth, isWithinInterval, startOfYear } from 'date-fns'
import { readProfile } from './profile'

// ── Storage ─────────────────────────────────────────────────────────────────
// Business records are a lens over the same wallet: paid invoices are business
// revenue; "pay yourself" transfers create personal income transactions.

export const INVOICES_KEY = 'vallety_invoices'
export const EXPENSES_KEY = 'vallety_expenses'
export const CLIENTS_KEY = 'vallety_clients'

export type InvoiceStatus = 'draft' | 'sent' | 'paid'

/** Finnish VAT (ALV) rates: general 25.5%, reduced 14% / 10%, zero-rated. */
export const VAT_RATES = [25.5, 14, 10, 0] as const

export interface Invoice {
  id: string
  client: string
  description: string
  /** Net amount (excluding VAT), € */
  amount: number
  vatRate: number
  status: InvoiceStatus
  issuedAt: string // ISO
  dueDate: string // ISO
  paidAt?: string // ISO
  createdAt: string
}

export interface BusinessExpense {
  id: string
  vendor: string
  /** Net amount (excluding VAT), € */
  amount: number
  vatRate: number
  category: string
  date: string // ISO
  createdAt: string
}

export interface Client {
  id: string
  name: string
  email?: string
  note?: string
  createdAt: string
}

function readArray<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function writeArray<T>(key: string, value: T[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

let counter = 0
const newId = (p: string) => `${p}_${Date.now()}_${(counter += 1)}`

// ── Invoices ────────────────────────────────────────────────────────────────

export const readInvoices = (): Invoice[] => readArray<Invoice>(INVOICES_KEY)

export function addInvoice(input: Omit<Invoice, 'id' | 'createdAt'>): Invoice[] {
  const next = [...readInvoices(), { ...input, id: newId('inv'), createdAt: new Date().toISOString() }]
  writeArray(INVOICES_KEY, next)
  return next
}

export function updateInvoice(id: string, patch: Partial<Invoice>): Invoice[] {
  const next = readInvoices().map((i) => (i.id === id ? { ...i, ...patch } : i))
  writeArray(INVOICES_KEY, next)
  return next
}

export function deleteInvoice(id: string): Invoice[] {
  const next = readInvoices().filter((i) => i.id !== id)
  writeArray(INVOICES_KEY, next)
  return next
}

export const invoiceGross = (i: Invoice): number => i.amount * (1 + i.vatRate / 100)
export const invoiceVat = (i: Invoice): number => i.amount * (i.vatRate / 100)

// ── Expenses ────────────────────────────────────────────────────────────────

export const readExpenses = (): BusinessExpense[] => readArray<BusinessExpense>(EXPENSES_KEY)

export function addExpense(input: Omit<BusinessExpense, 'id' | 'createdAt'>): BusinessExpense[] {
  const next = [...readExpenses(), { ...input, id: newId('exp'), createdAt: new Date().toISOString() }]
  writeArray(EXPENSES_KEY, next)
  return next
}

export function deleteExpense(id: string): BusinessExpense[] {
  const next = readExpenses().filter((e) => e.id !== id)
  writeArray(EXPENSES_KEY, next)
  return next
}

export const EXPENSE_CATEGORIES = [
  'Software & tools', 'Equipment', 'Travel', 'Office', 'Marketing',
  'Phone & internet', 'Insurance', 'Professional services', 'Other',
]

// ── Clients ─────────────────────────────────────────────────────────────────

export const readClients = (): Client[] => readArray<Client>(CLIENTS_KEY)

export function addClient(input: Omit<Client, 'id' | 'createdAt'>): Client[] {
  const next = [...readClients(), { ...input, id: newId('cli'), createdAt: new Date().toISOString() }]
  writeArray(CLIENTS_KEY, next)
  return next
}

export function deleteClient(id: string): Client[] {
  const next = readClients().filter((c) => c.id !== id)
  writeArray(CLIENTS_KEY, next)
  return next
}

// ── Tax math (ESTIMATES — clearly labelled in the UI) ───────────────────────

/** YEL contribution rates by age bracket (2025). */
const YEL_RATES: Record<string, number> = {
  under53: 0.241,
  '53-62': 0.256,
  over62: 0.241,
}

/** Rough advance-tax (ennakkovero) rate applied to profit for estimation. */
export const ADVANCE_TAX_RATE = 0.25

export interface BusinessSummary {
  /** Paid revenue this month (net of VAT) */
  revenueMonth: number
  /** Sent but unpaid invoices (gross) */
  outstanding: number
  outstandingCount: number
  /** Business expenses this month (net) */
  expensesMonth: number
  /** VAT collected minus VAT deductible, year to date — owed to Vero */
  vatOwed: number
  /** Estimated advance tax on YTD profit */
  advanceTaxYtd: number
  /** Monthly YEL contribution from the profile's self-declared YEL income */
  yelMonthly: number
  /** The killer number: what's left to pay yourself this month */
  safeToPay: number
  profitYtd: number
}

export function computeBusinessSummary(
  invoices: Invoice[],
  expenses: BusinessExpense[],
  now: Date
): BusinessSummary {
  const mStart = startOfMonth(now)
  const mEnd = endOfMonth(now)
  const yStart = startOfYear(now)
  const inMonth = (iso: string) => {
    const d = new Date(iso)
    return !Number.isNaN(d.getTime()) && isWithinInterval(d, { start: mStart, end: mEnd })
  }
  const inYear = (iso: string) => {
    const d = new Date(iso)
    return !Number.isNaN(d.getTime()) && d >= yStart && d <= mEnd
  }

  const paid = invoices.filter((i) => i.status === 'paid')
  const revenueMonth = paid.filter((i) => inMonth(i.paidAt ?? i.issuedAt)).reduce((a, i) => a + i.amount, 0)
  const revenueYtd = paid.filter((i) => inYear(i.paidAt ?? i.issuedAt)).reduce((a, i) => a + i.amount, 0)

  const sent = invoices.filter((i) => i.status === 'sent')
  const outstanding = sent.reduce((a, i) => a + invoiceGross(i), 0)

  const expensesMonth = expenses.filter((e) => inMonth(e.date)).reduce((a, e) => a + e.amount, 0)
  const expensesYtd = expenses.filter((e) => inYear(e.date)).reduce((a, e) => a + e.amount, 0)

  const vatCollected = paid.filter((i) => inYear(i.paidAt ?? i.issuedAt)).reduce((a, i) => a + invoiceVat(i), 0)
  const vatDeductible = expenses.filter((e) => inYear(e.date)).reduce((a, e) => a + e.amount * (e.vatRate / 100), 0)
  const vatOwed = Math.max(0, vatCollected - vatDeductible)

  const profitYtd = Math.max(0, revenueYtd - expensesYtd)
  const advanceTaxYtd = profitYtd * ADVANCE_TAX_RATE

  const profile = readProfile()
  const yelIncome = Number(String(profile.yel_income).replace(',', '.')) || 0
  const yelRate = YEL_RATES[profile.age_bracket] ?? YEL_RATES.under53
  const yelMonthly = (yelIncome * yelRate) / 12

  const profitMonth = revenueMonth - expensesMonth
  const advanceTaxMonth = Math.max(0, profitMonth) * ADVANCE_TAX_RATE
  const vatMonth = paid.filter((i) => inMonth(i.paidAt ?? i.issuedAt)).reduce((a, i) => a + invoiceVat(i), 0)
    - expenses.filter((e) => inMonth(e.date)).reduce((a, e) => a + e.amount * (e.vatRate / 100), 0)

  // Safe to pay yourself = this month's net revenue − expenses − VAT to set
  // aside − estimated advance tax − YEL. Never negative for display sanity.
  const safeToPay = profitMonth - Math.max(0, vatMonth) - advanceTaxMonth - yelMonthly

  return {
    revenueMonth,
    outstanding,
    outstandingCount: sent.length,
    expensesMonth,
    vatOwed,
    advanceTaxYtd,
    yelMonthly,
    safeToPay,
    profitYtd,
  }
}
