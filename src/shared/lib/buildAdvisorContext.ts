import { subDays, format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { readTransactions } from './transactions'
import { readBudgets, computeBudgets } from './budgets'
import { readGoals } from './goals'
import { readBills, daysUntilDue } from './bills'

/** Income and expenses for the current month (used by the context cards). */
export function monthlyTotals(now: Date): { income: number; expenses: number } {
  const start = startOfMonth(now)
  const end = endOfMonth(now)
  let income = 0
  let expenses = 0
  for (const t of readTransactions()) {
    const d = new Date(t.date)
    if (Number.isNaN(d.getTime()) || !isWithinInterval(d, { start, end })) continue
    const amt = Math.abs(Number(t.amount) || 0)
    if (t.type === 'income') income += amt
    else expenses += amt
  }
  return { income, expenses }
}

/**
 * Build a compact financial summary from localStorage for the AI advisor.
 * Kept short (well under 800 tokens) by capping each section.
 */
export function buildAdvisorContext(now: Date): string {
  const lines: string[] = []

  // Spending — top 5 categories over the last 90 days
  const cutoff = subDays(now, 90)
  const byCategory: Record<string, number> = {}
  for (const t of readTransactions()) {
    if (t.type !== 'expense') continue
    const d = new Date(t.date)
    if (Number.isNaN(d.getTime()) || d < cutoff) continue
    const amt = Math.abs(Number(t.amount) || 0)
    byCategory[t.category] = (byCategory[t.category] || 0) + amt
  }
  const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5)
  if (top.length > 0) {
    lines.push(
      `Spending (last 90 days): ${top.map(([c, a]) => `€${Math.round(a)} on ${c}`).join(', ')}.`
    )
  }

  // Monthly income / expenses
  const { income, expenses } = monthlyTotals(now)
  if (income > 0 || expenses > 0) {
    lines.push(`This month: income €${Math.round(income)}, expenses €${Math.round(expenses)}.`)
  }

  // Budgets
  const budgets = readBudgets()
  if (budgets.length > 0) {
    const summary = computeBudgets(budgets, now)
    for (const v of summary.views.slice(0, 5)) {
      lines.push(
        `Budget: ${v.category} €${Math.round(v.spent)} used of €${Math.round(v.amount)} (${Math.round(v.pct)}%).`
      )
    }
  }

  // Goals
  for (const g of readGoals().slice(0, 5)) {
    const by = g.targetDate ? ` by ${format(new Date(g.targetDate), 'MMM yyyy')}` : ''
    lines.push(`Goal: ${g.name} €${Math.round(g.saved)} saved of €${Math.round(g.target)} target${by}.`)
  }

  // Upcoming bills (next 14 days)
  const upcoming = readBills()
    .filter((b) => !b.paused)
    .filter((b) => {
      const d = daysUntilDue(b, now)
      return d >= 0 && d <= 14
    })
    .slice(0, 5)
  for (const b of upcoming) {
    lines.push(`Upcoming bill: ${b.name} €${Math.round(b.amount)} due ${format(new Date(b.nextDue), 'MMM d')}.`)
  }

  if (lines.length === 0) {
    return 'The user has not added any financial data yet (no transactions, budgets, goals, or bills).'
  }
  return lines.join('\n')
}
