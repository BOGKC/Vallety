import { describe, it, expect, beforeEach } from 'vitest'
import {
  holdingValue, holdingCost, holdingGain, holdingGainPct,
  computePortfolio, addHolding, updateHolding, readHoldings,
} from './portfolio'
import { makeHolding } from '../../test/factories'

describe('per-holding math', () => {
  it('value, cost, gain and gain% are correct', () => {
    const h = makeHolding({ quantity: 10, avgCost: 10, currentPrice: 12 })
    expect(holdingValue(h)).toBe(120)
    expect(holdingCost(h)).toBe(100)
    expect(holdingGain(h)).toBe(20)
    expect(holdingGainPct(h)).toBeCloseTo(20, 6)
  })

  it('gain% is 0 (not NaN/Infinity) when cost is zero', () => {
    const h = makeHolding({ quantity: 5, avgCost: 0, currentPrice: 3 })
    expect(holdingGainPct(h)).toBe(0)
  })
})

describe('computePortfolio', () => {
  it('is all-zero and never NaN with no holdings', () => {
    const s = computePortfolio([])
    expect(s.totalValue).toBe(0)
    expect(s.gainPct).toBe(0)
    expect(s.dayChangePct).toBe(0)
    expect(s.topConcentrationPct).toBe(0)
    expect(s.allocation).toEqual([])
    for (const v of [s.totalValue, s.gain, s.gainPct, s.dayChange, s.dayChangePct, s.topConcentrationPct]) {
      expect(Number.isNaN(v)).toBe(false)
    }
  })

  it('aggregates value, invested and gain across holdings', () => {
    const s = computePortfolio([
      makeHolding({ quantity: 10, avgCost: 10, currentPrice: 12 }), // val 120, cost 100
      makeHolding({ quantity: 5, avgCost: 20, currentPrice: 18 }),  // val 90, cost 100
    ])
    expect(s.totalValue).toBe(210)
    expect(s.totalInvested).toBe(200)
    expect(s.gain).toBe(10)
    expect(s.gainPct).toBeCloseTo(5, 6)
  })

  it('day change uses prevPrice where present', () => {
    const s = computePortfolio([
      makeHolding({ quantity: 10, currentPrice: 12, prevPrice: 10 }), // +20
    ])
    expect(s.dayChange).toBe(20)
    expect(s.dayChangePct).toBeCloseTo(20, 6)
  })

  it('allocation groups by type and drops empty buckets', () => {
    const s = computePortfolio([
      makeHolding({ type: 'stock', quantity: 10, currentPrice: 10 }), // 100
      makeHolding({ type: 'crypto', quantity: 1, currentPrice: 50 }), // 50
    ])
    const byType = Object.fromEntries(s.allocation.map((a) => [a.type, a.value]))
    expect(byType).toEqual({ stock: 100, crypto: 50 })
  })

  it('top concentration is the largest holding share of total', () => {
    const s = computePortfolio([
      makeHolding({ quantity: 10, currentPrice: 30 }), // 300 (75%)
      makeHolding({ quantity: 10, currentPrice: 10 }), // 100 (25%)
    ])
    expect(s.topConcentrationPct).toBeCloseTo(75, 6)
  })

  it('movers are sorted best gain% first', () => {
    const s = computePortfolio([
      makeHolding({ ticker: 'A', quantity: 1, avgCost: 10, currentPrice: 11 }), // +10%
      makeHolding({ ticker: 'B', quantity: 1, avgCost: 10, currentPrice: 15 }), // +50%
    ])
    expect(s.movers.map((m) => m.ticker)).toEqual(['B', 'A'])
  })
})

describe('updateHolding weighted-average cost & prevPrice', () => {
  beforeEach(() => window.localStorage.clear())

  it('remembers the previous price when currentPrice changes', () => {
    const list = addHolding(makeHolding({ currentPrice: 10 }))
    const h = list[0]
    updateHolding(h.id, { currentPrice: 12 })
    const stored = readHoldings()[0]
    expect(stored.currentPrice).toBe(12)
    expect(stored.prevPrice).toBe(10)
  })

  it('does not clobber prevPrice when price is unchanged', () => {
    const list = addHolding(makeHolding({ currentPrice: 10, prevPrice: 8 }))
    updateHolding(list[0].id, { quantity: 99 })
    const stored = readHoldings()[0]
    expect(stored.prevPrice).toBe(8)
    expect(stored.quantity).toBe(99)
  })
})
