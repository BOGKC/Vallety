import { describe, it, expect } from 'vitest'
import { convert, mergeRates, FALLBACK_RATES, type RateMap } from './rates'

// units per 1 EUR
const RATES: RateMap = { EUR: 1, USD: 1.2, GBP: 0.8, JPY: 160 }

describe('convert', () => {
  it('same currency is a no-op', () => {
    expect(convert(100, 'EUR', 'EUR', RATES)).toEqual({ amount: 100, ok: true })
    expect(convert(100, 'usd', 'USD', RATES)).toEqual({ amount: 100, ok: true })
  })

  it('EUR → other multiplies by the rate', () => {
    expect(convert(100, 'EUR', 'USD', RATES).amount).toBeCloseTo(120, 6)
    expect(convert(100, 'EUR', 'JPY', RATES).amount).toBeCloseTo(16000, 6)
  })

  it('other → EUR divides by the rate', () => {
    expect(convert(120, 'USD', 'EUR', RATES).amount).toBeCloseTo(100, 6)
  })

  it('derives cross-rates through EUR', () => {
    // 120 USD → 100 EUR → 80 GBP
    expect(convert(120, 'USD', 'GBP', RATES).amount).toBeCloseTo(80, 6)
  })

  it('returns ok:false when a rate is missing (no crash, no wrong number)', () => {
    expect(convert(100, 'EUR', 'ZZZ', RATES)).toEqual({ amount: null, ok: false })
    expect(convert(100, 'ZZZ', 'EUR', RATES)).toEqual({ amount: null, ok: false })
  })

  it('guards non-finite input', () => {
    expect(convert(NaN, 'EUR', 'USD', RATES).ok).toBe(false)
  })
})

describe('mergeRates', () => {
  it('layers live rates over the fallback and pins EUR to 1', () => {
    const merged = mergeRates({ USD: 1.5, EUR: 999 })
    expect(merged.EUR).toBe(1)
    expect(merged.USD).toBe(1.5)
    expect(merged.JPY).toBe(FALLBACK_RATES.JPY) // untouched fallback
  })
  it('null live rates → pure fallback', () => {
    expect(mergeRates(null)).toEqual({ ...FALLBACK_RATES, EUR: 1 })
  })
})
