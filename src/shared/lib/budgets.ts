import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { readTransactions } from './transactions'

// ── Storage ─────────────────────────────────────────────────────────────────

export const BUDGETS_KEY = 'vallety_budgets'

export type BudgetPeriod = 'monthly' | 'weekly' | 'yearly'

export interface Budget {
  id: string
  category: string
  amount: number
  period: BudgetPeriod
  color?: string
  createdAt: string
}

function normalize(raw: unknown): Budget | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const amount = Number(r.amount)
  if (!Number.isFinite(amount)) return null
  return {
    id: String(r.id ?? `bud_${Date.now()}`),
    category: String(r.category ?? 'Other'),
    amount: Math.abs(amount),
    period: (r.period as BudgetPeriod) ?? 'monthly',
    color: r.color != null ? String(r.color) : undefined,
    createdAt: String(r.createdAt ?? new Date().toISOString()),
  }
}

export function readBudgets(): Budget[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(BUDGETS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalize).filter((b): b is Budget => b !== null)
  } catch {
    return []
  }
}

export function writeBudgets(budgets: Budget[]): void {
  try {
    window.localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets))
  } catch {
    /* ignore */
  }
}

export function addBudget(input: Omit<Budget, 'id' | 'createdAt'>): Budget[] {
  const budget: Budget = {
    ...input,
    amount: Math.abs(input.amount),
    id: `bud_${Date.now()}_${Math.floor(performance.now())}`,
    createdAt: new Date().toISOString(),
  }
  const next = [...readBudgets(), budget]
  writeBudgets(next)
  return next
}

export function deleteBudget(id: string): Budget[] {
  const next = readBudgets().filter((b) => b.id !== id)
  writeBudgets(next)
  return next
}

// ── Suggestions (empty-state quick-start) ─────────────────────────────────────

export const BUDGET_SUGGESTIONS: { category: string; amount: number }[] = [
  { category: 'Groceries', amount: 300 },
  { category: 'Dining', amount: 150 },
  { category: 'Transport', amount: 100 },
  { category: 'Entertainment', amount: 80 },
  { category: 'Utilities', amount: 120 },
]

// ── Computation ───────────────────────────────────────────────────────────────

/** Threshold colour shared by progress fills and the health metric. */
export function usageColor(pct: number): string {
  if (pct < 70) return '#22C55E'
  if (pct < 90) return '#F59E0B'
  return '#EF4444'
}

export interface BudgetView {
  id: string
  category: string
  amount: number
  spent: number
  pct: number // may exceed 100
  fillColor: string
}

export interface BudgetSummary {
  totalBudgeted: number
  totalSpent: number
  overallPct: number
  daysLeft: number
  views: BudgetView[]
}

export function computeBudgets(budgets: Budget[], now: Date): BudgetSummary {
  const txns = readTransactions()
  const start = startOfMonth(now)
  const end = endOfMonth(now)

  const spentByCategory = (category: string) =>
    txns.reduce((acc, t) => {
      if (t.type !== 'expense' || t.category !== category) return acc
      const d = new Date(t.date)
      if (Number.isNaN(d.getTime()) || !isWithinInterval(d, { start, end })) return acc
      return acc + Math.abs(Number(t.amount) || 0)
    }, 0)

  const views: BudgetView[] = budgets.map((b) => {
    const spent = spentByCategory(b.category)
    const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0
    return { id: b.id, category: b.category, amount: b.amount, spent, pct, fillColor: usageColor(pct) }
  })

  const totalBudgeted = budgets.reduce((a, b) => a + b.amount, 0)
  const totalSpent = views.reduce((a, v) => a + v.spent, 0)
  const overallPct = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0
  const daysLeft = Math.max(0, end.getDate() - now.getDate())

  return { totalBudgeted, totalSpent, overallPct, daysLeft, views }
}
