import {
  startOfMonth, endOfMonth, subMonths, addMonths, startOfDay, addDays,
  setDate, format, isWithinInterval, differenceInCalendarMonths,
} from 'date-fns'
import type { FinanceData } from './localData'

// ── Helpers ─────────────────────────────────────────────────────────────────

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function sumInRange(
  txns: FinanceData['transactions'],
  type: 'income' | 'expense',
  start: Date,
  end: Date
): number {
  return txns.reduce((acc, t) => {
    if (t.type !== type) return acc
    const d = toDate(t.date)
    if (!d || !isWithinInterval(d, { start, end })) return acc
    const amt = Number(t.amount)
    return acc + (Number.isFinite(amt) ? amt : 0)
  }, 0)
}

/** Percentage change from previous → current. Null when previous is 0. */
function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / Math.abs(previous)) * 100)
}

// ── Result shape ──────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  hasData: boolean
  monthLabel: string
  safeToSpend: {
    hasIncome: boolean
    amount: number
    income: number
    bills: number
    budgets: number
    goals: number
  }
  income: { value: number; delta: number | null }
  expenses: { value: number; delta: number | null }
  budget: { usedPct: number; total: number }
  saved: { value: number; delta: number | null }
  cashflow: { month: string; income: number; expenses: number }[]
  upcomingBills: { name: string; amount: number; date: string }[]
}

// ── Main computation ──────────────────────────────────────────────────────────

export function computeDashboard(data: FinanceData, now: Date): DashboardMetrics {
  const { transactions, budgets, goals, bills } = data

  const hasData =
    transactions.length > 0 || budgets.length > 0 || goals.length > 0

  const thisStart = startOfMonth(now)
  const thisEnd = endOfMonth(now)
  const lastStart = startOfMonth(subMonths(now, 1))
  const lastEnd = endOfMonth(subMonths(now, 1))

  // ── Income / expenses (this vs last month) ──
  const income = sumInRange(transactions, 'income', thisStart, thisEnd)
  const expenses = sumInRange(transactions, 'expense', thisStart, thisEnd)
  const incomeLast = sumInRange(transactions, 'income', lastStart, lastEnd)
  const expensesLast = sumInRange(transactions, 'expense', lastStart, lastEnd)

  // ── Active budgets & bills totals ──
  const activeBudgets = budgets.filter((b) => b.is_active !== false)
  const budgetTotal = activeBudgets.reduce(
    (acc, b) => acc + (Number.isFinite(Number(b.amount)) ? Number(b.amount) : 0),
    0
  )

  const activeBills = bills.filter((b) => b.is_active !== false)
  const billsTotal = activeBills.reduce(
    (acc, b) => acc + (Number.isFinite(Number(b.amount)) ? Number(b.amount) : 0),
    0
  )

  // ── Goal contributions: remaining spread over months left ──
  const goalContributions = goals
    .filter((g) => g.status === 'active' || g.status === undefined)
    .reduce((acc, g) => {
      const target = Number(g.target_amount) || 0
      const current = Number(g.current_amount) || 0
      const remaining = Math.max(0, target - current)
      if (remaining === 0) return acc
      const targetDate = toDate(g.target_date)
      if (!targetDate) return acc
      const monthsLeft = Math.max(1, differenceInCalendarMonths(targetDate, now))
      return acc + remaining / monthsLeft
    }, 0)

  // ── Safe to spend ──
  const safeAmount = income - billsTotal - budgetTotal - goalContributions

  // ── Budget health ──
  const usedPct = budgetTotal > 0 ? Math.round((expenses / budgetTotal) * 100) : 0

  // ── Net saved ──
  const saved = income - expenses
  const savedLast = incomeLast - expensesLast

  // ── Cash flow, last 6 months ──
  const cashflow = Array.from({ length: 6 }, (_, i) => {
    const ref = subMonths(now, 5 - i)
    const s = startOfMonth(ref)
    const e = endOfMonth(ref)
    return {
      month: format(s, 'MMM'),
      income: sumInRange(transactions, 'income', s, e),
      expenses: sumInRange(transactions, 'expense', s, e),
    }
  })

  // ── Upcoming bills, next 7 days ──
  const today = startOfDay(now)
  const weekEnd = addDays(today, 7)
  const upcomingBills = activeBills
    .map((b) => {
      const dueDay = Number(b.due_day)
      if (!Number.isFinite(dueDay) || dueDay < 1) return null

      const daysThis = endOfMonth(now).getDate()
      let due = startOfDay(setDate(now, Math.min(dueDay, daysThis)))
      if (due < today) {
        const next = addMonths(now, 1)
        const daysNext = endOfMonth(next).getDate()
        due = startOfDay(setDate(next, Math.min(dueDay, daysNext)))
      }
      if (!isWithinInterval(due, { start: today, end: weekEnd })) return null

      return {
        name: b.name ?? 'Bill',
        amount: Number(b.amount) || 0,
        date: format(due, 'MMM d'),
        _sort: due.getTime(),
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a._sort - b._sort)
    .map((b) => ({ name: b.name, amount: b.amount, date: b.date }))

  return {
    hasData,
    monthLabel: format(now, 'MMMM yyyy'),
    safeToSpend: {
      hasIncome: income > 0,
      amount: safeAmount,
      income,
      bills: billsTotal,
      budgets: budgetTotal,
      goals: goalContributions,
    },
    income: { value: income, delta: deltaPct(income, incomeLast) },
    expenses: { value: expenses, delta: deltaPct(expenses, expensesLast) },
    budget: { usedPct, total: budgetTotal },
    saved: { value: saved, delta: deltaPct(saved, savedLast) },
    cashflow,
    upcomingBills,
  }
}
