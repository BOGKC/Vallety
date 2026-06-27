import type { Transaction, Budget, Goal, Bill } from '../../supabase/types'

/**
 * Local-first data access. The app persists finance records in localStorage
 * until a backend sync exists. All readers are defensive: a missing key,
 * malformed JSON, or a non-array payload resolves to an empty array so the
 * UI never crashes on bad/absent data.
 */

export const STORAGE_KEYS = {
  transactions: 'vallety_transactions',
  budgets: 'vallety_budgets',
  goals: 'vallety_goals',
  bills: 'vallety_bills',
} as const

function readArray<T>(key: string): T[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export const getTransactions = (): Transaction[] =>
  readArray<Transaction>(STORAGE_KEYS.transactions)

export const getBudgets = (): Budget[] => readArray<Budget>(STORAGE_KEYS.budgets)

export const getGoals = (): Goal[] => readArray<Goal>(STORAGE_KEYS.goals)

export const getBills = (): Bill[] => readArray<Bill>(STORAGE_KEYS.bills)

export interface FinanceData {
  transactions: Transaction[]
  budgets: Budget[]
  goals: Goal[]
  bills: Bill[]
}

export function loadFinanceData(): FinanceData {
  return {
    transactions: getTransactions(),
    budgets: getBudgets(),
    goals: getGoals(),
    bills: getBills(),
  }
}
