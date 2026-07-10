import { describe, it, expect } from 'vitest'
import {
  computeTotals, isLiability, monthlyDelta, ensureMonthlySnapshot,
  writeAccounts, readSnapshots, type Snapshot,
} from './netWorth'
import { makeAccount } from '../../test/factories'

describe('computeTotals', () => {
  it('net worth = assets − liabilities', () => {
    const t = computeTotals([
      makeAccount({ type: 'checking', balance: 5000 }),
      makeAccount({ type: 'savings', balance: 3000 }),
      makeAccount({ type: 'mortgage', balance: 100000 }),
      makeAccount({ type: 'loan', balance: 2000 }),
    ])
    expect(t.assets).toBe(8000)
    expect(t.liabilities).toBe(102000)
    expect(t.net).toBe(-94000)
    expect(t.count).toBe(4)
  })

  it('is zero (not NaN) with no accounts', () => {
    const t = computeTotals([])
    expect(t).toEqual({ assets: 0, liabilities: 0, net: 0, count: 0 })
  })

  it('classifies only loan and mortgage as liabilities', () => {
    expect(isLiability('loan')).toBe(true)
    expect(isLiability('mortgage')).toBe(true)
    expect(isLiability('checking')).toBe(false)
    expect(isLiability('investment')).toBe(false)
    expect(isLiability('crypto')).toBe(false)
  })
})

describe('monthlyDelta', () => {
  const snaps: Snapshot[] = [
    { date: '2026-04-30T00:00:00.000Z', totalAssets: 0, totalLiabilities: 0, netWorth: 10000 },
    { date: '2026-05-31T00:00:00.000Z', totalAssets: 0, totalLiabilities: 0, netWorth: 12000 },
  ]
  it('compares against the newest prior-month snapshot', () => {
    expect(monthlyDelta(15000, snaps, new Date('2026-06-15'))).toBe(3000) // 15000 − 12000
  })
  it('returns null when there is no earlier-month snapshot', () => {
    expect(monthlyDelta(15000, [], new Date('2026-06-15'))).toBeNull()
  })
})

describe('ensureMonthlySnapshot', () => {
  it('writes at most one snapshot per calendar month (idempotent)', () => {
    writeAccounts([makeAccount({ balance: 1000 })])
    ensureMonthlySnapshot()
    ensureMonthlySnapshot()
    ensureMonthlySnapshot()
    expect(readSnapshots()).toHaveLength(1)
  })

  it('records nothing when there are no accounts', () => {
    ensureMonthlySnapshot()
    expect(readSnapshots()).toHaveLength(0)
  })
})
