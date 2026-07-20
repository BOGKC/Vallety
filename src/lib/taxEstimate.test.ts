import { describe, it, expect } from 'vitest'
import {
  TAX_RATES, estimateALV, estimateIncomeTax, estimateYEL, estimateTakeHome,
  parsePercent, resolveRates,
} from './taxEstimate'

describe('estimateALV', () => {
  it('splits a gross amount into net + VAT at the standard rate', () => {
    const r = estimateALV(125.5) // 25.5%
    expect(r.gross).toBe(125.5)
    expect(r.net).toBeCloseTo(100, 6)
    expect(r.alv).toBeCloseTo(25.5, 6)
  })
  it('honours a custom rate', () => {
    const r = estimateALV(114, TAX_RATES.ALV_REDUCED_1) // 14%
    expect(r.net).toBeCloseTo(100, 6)
    expect(r.alv).toBeCloseTo(14, 6)
  })
  it('handles zero / invalid gracefully (€0, no NaN)', () => {
    expect(estimateALV(0)).toEqual({ net: 0, alv: 0, gross: 0 })
    expect(estimateALV(NaN).net).toBe(0)
    expect(estimateALV(-50).gross).toBe(0)
  })
})

describe('estimateIncomeTax / estimateYEL', () => {
  it('flat percentage of income', () => {
    expect(estimateIncomeTax(10000)).toBeCloseTo(3000, 6) // 30%
    expect(estimateIncomeTax(10000, 0.2)).toBeCloseTo(2000, 6)
  })
  it('YEL at the configured rate', () => {
    expect(estimateYEL(10000)).toBeCloseTo(2410, 6) // 24.1%
  })
  it('zero/invalid → 0', () => {
    expect(estimateIncomeTax(0)).toBe(0)
    expect(estimateYEL(NaN)).toBe(0)
  })
})

describe('estimateTakeHome', () => {
  it('waterfalls revenue − ALV − income tax − YEL − expenses with a breakdown', () => {
    // gross 1255 @25.5% → net 1000, alv 255. incomeTax 30%*1000=300, YEL 24.1%*1000=241
    const b = estimateTakeHome({ revenue: 1255, expenses: 100 })
    expect(b.alvCollected).toBeCloseTo(255, 4)
    expect(b.netRevenue).toBeCloseTo(1000, 4)
    expect(b.incomeTax).toBeCloseTo(300, 4)
    expect(b.yel).toBeCloseTo(241, 4)
    expect(b.takeHome).toBeCloseTo(1000 - 300 - 241 - 100, 4) // 359
    // breakdown: revenue + 4 deductions, deductions negative
    expect(b.lines).toHaveLength(5)
    expect(b.lines[0].amount).toBeCloseTo(1255, 4)
    expect(b.lines.slice(1).every((l) => l.amount <= 0)).toBe(true)
  })
  it('respects custom rates', () => {
    const b = estimateTakeHome({ revenue: 100, expenses: 0, alvRate: 0, incomeTaxRate: 0, yelRate: 0 })
    expect(b.takeHome).toBeCloseTo(100, 6)
  })
  it('empty/zero inputs → all zeros, no NaN', () => {
    const b = estimateTakeHome({ revenue: 0, expenses: 0 })
    expect(b.takeHome).toBe(0)
    expect(Number.isNaN(b.takeHome)).toBe(false)
  })
})

describe('rate resolution', () => {
  it('parsePercent: blank → fallback, valid → decimal, tolerates comma', () => {
    expect(parsePercent('', 0.3)).toBe(0.3)
    expect(parsePercent(undefined, 0.3)).toBe(0.3)
    expect(parsePercent('30', 0.3)).toBeCloseTo(0.3, 6)
    expect(parsePercent('24,1', 0.241)).toBeCloseTo(0.241, 6)
    expect(parsePercent('999', 0.3)).toBe(0.3) // out of range → fallback
  })
  it('resolveRates falls back to TAX_RATES when overrides are blank', () => {
    expect(resolveRates()).toEqual({
      alvRate: TAX_RATES.ALV_STANDARD,
      incomeTaxRate: TAX_RATES.INCOME_TAX_ESTIMATE,
      yelRate: TAX_RATES.YEL_RATE,
    })
    expect(resolveRates({ incomeTaxPct: '25' }).incomeTaxRate).toBeCloseTo(0.25, 6)
  })
})
