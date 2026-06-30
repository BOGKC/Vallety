import {
  startOfMonth, endOfMonth, subMonths, startOfDay,
  format, isWithinInterval, differenceInCalendarMonths,
} from 'date-fns'
import type { Txn } from './transactions'
import type { Budget } from './budgets'
import type { Goal } from './goals'
import { daysUntilDue, isPaidThisMonth, monthlyAmount, type Bill } from './bills'

// ── Input ───────────────────────────────────────────────────────────────────
// The dashboard reads the same camelCase domain records the rest of the app
// writes (transactions.ts / budgets.ts / goals.ts / bills.ts), so the numbers
// always reflect what the user actually entered.

export interface DashboardInput {
  transactions: Txn[]
  budgets: Budget[]
  goals: Goal[]
  bills: Bill[]
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function sumInRange(txns: Txn[], type: 'income' | 'expense', start: Date, end: Date): number {
  return txns.reduce((acc, t) => {
    if (t.type !== type) return acc
    const d = toDate(t.date)
    if (!d || !isWithinInterval(d, { start, end })) return acc
    const amt = Number(t.amount)
    return acc + (Number.isFinite(amt) ? amt : 0)
  }, 0)
}

/** Monthly-equivalent of a budget regardless of its period. */
function budgetMonthly(b: Budget): number {
  const amt = Number.isFinite(Number(b.amount)) ? Number(b.amount) : 0
  switch (b.period) {
    case 'weekly': return (amt * 52) / 12
    case 'yearly': return amt / 12
    case 'monthly':
    default: return amt
  }
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

export function computeDashboard(data: DashboardInput, now: Date): DashboardMetrics {
  const { transactions, budgets, goals, bills } = data

  const hasData =
    transactions.length > 0 || budgets.length > 0 || goals.length > 0 || bills.length > 0

  const thisStart = startOfMonth(now)
  const thisEnd = endOfMonth(now)
  const lastStart = startOfMonth(subMonths(now, 1))
  const lastEnd = endOfMonth(subMonths(now, 1))

  // ── Income / expenses (this vs last month) ──
  const income = sumInRange(transactions, 'income', thisStart, thisEnd)
  const expenses = sumInRange(transactions, 'expense', thisStart, thisEnd)
  const incomeLast = sumInRange(transactions, 'income', lastStart, lastEnd)
  const expensesLast = sumInRange(transactions, 'expense', lastStart, lastEnd)

  // ── Monthly budget & bill load ──
  const budgetTotal = budgets.reduce((acc, b) => acc + budgetMonthly(b), 0)
  const billsTotal = bills
    .filter((b) => !b.paused)
    .reduce((acc, b) => acc + monthlyAmount(b), 0)

  // ── Goal contributions: remaining spread over months left ──
  const goalContributions = goals.reduce((acc, g) => {
    const remaining = Math.max(0, g.target - g.saved)
    if (remaining === 0) return acc
    const targetDate = toDate(g.targetDate)
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

  // ── Upcoming bills, next 7 days (unpaid, not paused) ──
  const today = startOfDay(now)
  const upcomingBills = bills
    .filter((b) => !b.paused && !isPaidThisMonth(b, now))
    .map((b) => ({ bill: b, days: daysUntilDue(b, today) }))
    .filter((x) => x.days >= 0 && x.days <= 7)
    .sort((a, b) => a.days - b.days)
    .map(({ bill }) => ({
      name: bill.name,
      amount: bill.amount,
      date: format(new Date(bill.nextDue), 'MMM d'),
    }))

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
