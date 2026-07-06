import { subDays, format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { readTransactions } from './transactions'
import { readBudgets, computeBudgets } from './budgets'
import { readGoals } from './goals'
import { readBills, daysUntilDue } from './bills'
import { readInvoices, readExpenses, computeBusinessSummary } from './business'
import { readHoldings, computePortfolio, holdingValue, holdingGainPct } from './portfolio'
import { readProfile } from './profile'
import type { AppMode } from '../types'

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

/** Business lens: revenue, invoices, expenses, and Finnish tax estimates. */
function businessContext(now: Date): string[] {
  const invoices = readInvoices()
  const expenses = readExpenses()
  if (invoices.length === 0 && expenses.length === 0) {
    return ['The user has no business records yet (no invoices or business expenses).']
  }
  const s = computeBusinessSummary(invoices, expenses, now)
  const profile = readProfile()
  const lines = [
    `Business type: ${profile.business_type || 'not set'}${profile.vat_registered ? `, VAT-registered (files ${profile.vat_frequency})` : ', not VAT-registered'}.`,
    `Business this month: €${Math.round(s.revenueMonth)} paid revenue (net), €${Math.round(s.expensesMonth)} expenses.`,
    `Outstanding invoices: ${s.outstandingCount} totalling €${Math.round(s.outstanding)} (gross).`,
    `ALV owed YTD: €${Math.round(s.vatOwed)}. Estimated advance tax YTD: €${Math.round(s.advanceTaxYtd)} (on €${Math.round(s.profitYtd)} profit).`,
    `YEL: ~€${Math.round(s.yelMonthly)}/month${profile.yel_income ? ` from declared YEL income €${profile.yel_income}` : ' (YEL income not set)'}.`,
    `Safe to pay yourself this month (after ALV, est. tax, YEL, expenses): €${Math.round(s.safeToPay)}.`,
  ]
  return lines
}

/** Investment lens: portfolio composition and performance. */
function portfolioContext(): string[] {
  const holdings = readHoldings()
  if (holdings.length === 0) return ['The user has no holdings recorded yet.']
  const s = computePortfolio(holdings)
  const lines = [
    `Portfolio: €${Math.round(s.totalValue)} current value on €${Math.round(s.totalInvested)} invested (${s.gainPct >= 0 ? '+' : ''}${s.gainPct.toFixed(1)}%). Dividends YTD €${Math.round(s.dividendsYtd)}.`,
    `Allocation: ${s.allocation.map((a) => `${a.label} ${s.totalValue > 0 ? Math.round((a.value / s.totalValue) * 100) : 0}%`).join(', ')}. Largest position is ${Math.round(s.topConcentrationPct)}% of the portfolio.`,
  ]
  for (const h of s.movers.slice(0, 8)) {
    lines.push(
      `Holding: ${h.ticker} (${h.name}, ${h.type}) — ${h.quantity} units, value €${Math.round(holdingValue(h))}, gain ${holdingGainPct(h) >= 0 ? '+' : ''}${holdingGainPct(h).toFixed(1)}%.`
    )
  }
  return lines
}

/**
 * Build a compact financial summary from localStorage for the AI advisor.
 * Kept short (well under 800 tokens) by capping each section. The mode adds
 * its lens (business / portfolio) on top of the shared personal picture.
 */
export function buildAdvisorContext(now: Date, mode: AppMode = 'personal'): string {
  const lines: string[] = []

  if (mode === 'business') lines.push(...businessContext(now), '')
  if (mode === 'investment') lines.push(...portfolioContext(), '')

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
