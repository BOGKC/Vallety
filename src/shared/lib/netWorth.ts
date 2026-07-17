import { format } from 'date-fns'
import {
  Building2, PiggyBank, TrendingUp, Home, Bitcoin, CreditCard, Landmark, Wallet,
  type LucideIcon,
} from 'lucide-react'

// ── Storage keys ──────────────────────────────────────────────────────────────

export const ACCOUNTS_KEY = 'vallety_accounts'
export const SNAPSHOTS_KEY = 'vallety_snapshots'
export const LAST_SNAPSHOT_MONTH_KEY = 'vallety_last_snapshot_month'

export type AccountType =
  | 'checking' | 'savings' | 'investment' | 'property'
  | 'loan' | 'mortgage' | 'crypto' | 'other'

const LIABILITY_TYPES: AccountType[] = ['loan', 'mortgage']

export function isLiability(type: AccountType): boolean {
  return LIABILITY_TYPES.includes(type)
}

export const ACCOUNT_TYPES: { type: AccountType; label: string; icon: LucideIcon }[] = [
  { type: 'checking', label: 'Checking', icon: Building2 },
  { type: 'savings', label: 'Savings', icon: PiggyBank },
  { type: 'investment', label: 'Investment', icon: TrendingUp },
  { type: 'property', label: 'Property', icon: Home },
  { type: 'loan', label: 'Loan', icon: CreditCard },
  { type: 'mortgage', label: 'Mortgage', icon: Landmark },
  { type: 'crypto', label: 'Crypto', icon: Bitcoin },
  { type: 'other', label: 'Other', icon: Wallet },
]

export const ACCOUNT_ICONS: Record<AccountType, LucideIcon> = {
  checking: Building2,
  savings: PiggyBank,
  investment: TrendingUp,
  property: Home,
  loan: CreditCard,
  mortgage: Landmark,
  crypto: Bitcoin,
  other: Wallet,
}

export function accountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPES.find((t) => t.type === type)?.label ?? 'Other'
}

// ── Account model ─────────────────────────────────────────────────────────────

export interface Account {
  id: string
  name: string
  type: AccountType
  institution?: string
  balance: number
  currency: string
  createdAt: string
}

function normalizeAccount(raw: unknown): Account | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const balance = Number(r.balance)
  if (!Number.isFinite(balance)) return null
  const type = ACCOUNT_TYPES.some((t) => t.type === r.type) ? (r.type as AccountType) : 'other'
  return {
    id: String(r.id ?? `acc_${Date.now()}`),
    name: String(r.name ?? 'Account'),
    type,
    institution: r.institution ? String(r.institution) : undefined,
    balance: Math.abs(balance),
    currency: String(r.currency ?? 'EUR'),
    createdAt: String(r.createdAt ?? new Date().toISOString()),
  }
}

export function readAccounts(): Account[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeAccount).filter((a): a is Account => a !== null)
  } catch {
    return []
  }
}

export function writeAccounts(accounts: Account[]): void {
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  } catch {
    /* ignore */
  }
}

export function addAccount(input: Omit<Account, 'id' | 'createdAt'>): Account[] {
  const acc: Account = {
    ...input,
    balance: Math.abs(input.balance),
    id: `acc_${Date.now()}_${Math.floor(performance.now())}`,
    createdAt: new Date().toISOString(),
  }
  const next = [...readAccounts(), acc]
  writeAccounts(next)
  return next
}

export function updateAccount(id: string, patch: Partial<Account>): Account[] {
  const next = readAccounts().map((a) => (a.id === id ? { ...a, ...patch } : a))
  writeAccounts(next)
  return next
}

export function deleteAccount(id: string): Account[] {
  const next = readAccounts().filter((a) => a.id !== id)
  writeAccounts(next)
  return next
}

// ── Totals ────────────────────────────────────────────────────────────────────

export interface Totals {
  assets: number
  liabilities: number
  net: number
  count: number
}

export function computeTotals(accounts: Account[]): Totals {
  let assets = 0
  let liabilities = 0
  for (const a of accounts) {
    if (isLiability(a.type)) liabilities += a.balance
    else assets += a.balance
  }
  return { assets, liabilities, net: assets - liabilities, count: accounts.length }
}

type Convert = (amount: number, from: string, to: string) => { amount: number | null; ok: boolean }

/**
 * Totals with every account balance converted into `home` currency. Accounts
 * whose rate is unavailable are excluded from the sums and counted in
 * `unconverted` so the UI can flag them rather than show a wrong number.
 */
export function computeTotalsConverted(
  accounts: Account[], home: string, convert: Convert,
): Totals & { unconverted: number } {
  let assets = 0
  let liabilities = 0
  let unconverted = 0
  for (const a of accounts) {
    const r = convert(a.balance, a.currency || home, home)
    if (!r.ok || r.amount == null) { unconverted++; continue }
    if (isLiability(a.type)) liabilities += r.amount
    else assets += r.amount
  }
  return { assets, liabilities, net: assets - liabilities, count: accounts.length, unconverted }
}

// ── Snapshots ─────────────────────────────────────────────────────────────────

export interface Snapshot {
  date: string // ISO
  totalAssets: number
  totalLiabilities: number
  netWorth: number
}

export function readSnapshots(): Snapshot[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(SNAPSHOTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return (parsed as Snapshot[])
      .filter((s) => s && typeof s.date === 'string')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  } catch {
    return []
  }
}

export function writeSnapshots(snapshots: Snapshot[]): void {
  try {
    window.localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots))
  } catch {
    /* ignore */
  }
}

/**
 * Records one snapshot per calendar month (only when accounts exist).
 * Idempotent: guarded by the last-snapshot-month key, so repeated calls in
 * the same month — including React StrictMode double-invocation — are no-ops.
 * Returns the current snapshots array.
 */
export function ensureMonthlySnapshot(): Snapshot[] {
  const accounts = readAccounts()
  if (accounts.length === 0) return readSnapshots()

  const currentMonth = format(new Date(), 'yyyy-MM')
  let lastMonth: string | null
  try {
    lastMonth = window.localStorage.getItem(LAST_SNAPSHOT_MONTH_KEY)
  } catch {
    lastMonth = null
  }
  if (lastMonth === currentMonth) return readSnapshots()

  const totals = computeTotals(accounts)
  const snapshot: Snapshot = {
    date: new Date().toISOString(),
    totalAssets: totals.assets,
    totalLiabilities: totals.liabilities,
    netWorth: totals.net,
  }
  const next = [...readSnapshots(), snapshot]
  writeSnapshots(next)
  try {
    window.localStorage.setItem(LAST_SNAPSHOT_MONTH_KEY, currentMonth)
  } catch {
    /* ignore */
  }
  return next
}

/** Net-worth change vs the most recent snapshot from a previous month. */
export function monthlyDelta(currentNet: number, snapshots: Snapshot[], now: Date): number | null {
  const currentMonth = format(now, 'yyyy-MM')
  const prior = [...snapshots]
    .filter((s) => format(new Date(s.date), 'yyyy-MM') < currentMonth)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
  if (!prior) return null
  return currentNet - prior.netWorth
}
