import { describe, it, expect } from 'vitest'
import { computeBudgets, usageColor } from './budgets'
import { TRANSACTIONS_KEY } from './transactions'
import { makeBudget, makeTxn } from '../../test/factories'

const NOW = new Date('2026-06-15T12:00:00.000Z')

function seedTxns(txns: ReturnType<typeof makeTxn>[]) {
  window.localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txns))
}

describe('usageColor thresholds', () => {
  it('green < 70, amber 70–89, red ≥ 90', () => {
    expect(usageColor(0)).toBe('#22C55E')
    expect(usageColor(69.9)).toBe('#22C55E')
    expect(usageColor(70)).toBe('#F59E0B')
    expect(usageColor(89.9)).toBe('#F59E0B')
    expect(usageColor(90)).toBe('#EF4444')
    expect(usageColor(150)).toBe('#EF4444')
  })
})

describe('computeBudgets', () => {
  it('sums only in-month expenses in the matching category', () => {
    seedTxns([
      makeTxn({ type: 'expense', category: 'Groceries', amount: 120, date: '2026-06-05T00:00:00.000Z' }),
      makeTxn({ type: 'expense', category: 'Groceries', amount: 80, date: '2026-06-10T00:00:00.000Z' }),
      makeTxn({ type: 'expense', category: 'Groceries', amount: 999, date: '2026-05-30T00:00:00.000Z' }), // last month
      makeTxn({ type: 'expense', category: 'Dining', amount: 50, date: '2026-06-06T00:00:00.000Z' }), // other cat
      makeTxn({ type: 'income', category: 'Groceries', amount: 500, date: '2026-06-06T00:00:00.000Z' }), // income ignored
    ])
    const s = computeBudgets([makeBudget({ category: 'Groceries', amount: 400 })], NOW)
    expect(s.views[0].spent).toBe(200)
    expect(s.views[0].pct).toBeCloseTo(50, 6)
    expect(s.totalSpent).toBe(200)
    expect(s.overallPct).toBeCloseTo(50, 6)
  })

  it('pct is 0 (not NaN) for a €0 budget', () => {
    seedTxns([makeTxn({ category: 'Groceries', amount: 20, date: '2026-06-05T00:00:00.000Z' })])
    const s = computeBudgets([makeBudget({ category: 'Groceries', amount: 0 })], NOW)
    expect(s.views[0].pct).toBe(0)
    expect(Number.isNaN(s.overallPct)).toBe(false)
  })

  it('allows pct to exceed 100 when over budget and flags red', () => {
    seedTxns([makeTxn({ category: 'Groceries', amount: 500, date: '2026-06-05T00:00:00.000Z' })])
    const s = computeBudgets([makeBudget({ category: 'Groceries', amount: 400 })], NOW)
    expect(s.views[0].pct).toBeCloseTo(125, 6)
    expect(s.views[0].fillColor).toBe('#EF4444')
  })

  it('empty budgets → zero totals, no NaN', () => {
    seedTxns([])
    const s = computeBudgets([], NOW)
    expect(s).toMatchObject({ totalBudgeted: 0, totalSpent: 0, overallPct: 0 })
  })
})
