import { describe, it, expect } from 'vitest'
import { formatEuro, parseAmount } from './formatters'

describe('formatEuro', () => {
  it('rounds to whole euros by default with the sign before the symbol', () => {
    expect(formatEuro(1200)).toBe('€1,200')
    expect(formatEuro(-1200)).toBe('-€1,200')
    expect(formatEuro(0)).toBe('€0')
  })
  it('honours a decimals argument', () => {
    expect(formatEuro(12.5, 2)).toBe('€12.50')
    expect(formatEuro(-12.5, 2)).toBe('-€12.50')
  })
  it('handles large numbers with grouping', () => {
    expect(formatEuro(1234567)).toBe('€1,234,567')
  })

  // Regression: a tiny negative that rounds to zero must not show "-€0".
  it('never renders a negative sign on a value that rounds to zero', () => {
    expect(formatEuro(-0.3)).toBe('€0')
    expect(formatEuro(-0.49)).toBe('€0')
    expect(formatEuro(-0)).toBe('€0')
    expect(formatEuro(-0.004, 2)).toBe('€0.00')
  })

  // Never surface NaN/Infinity as a money value.
  it('guards against non-finite input', () => {
    expect(formatEuro(NaN)).toBe('€0')
    expect(formatEuro(Infinity)).toBe('€0')
  })
})

describe('parseAmount', () => {
  it('parses plain and comma-decimal input', () => {
    expect(parseAmount('12.50')).toBe(12.5)
    expect(parseAmount('12,50')).toBe(12.5)
  })
  it('strips whitespace', () => {
    expect(parseAmount(' 1 000 ')).toBe(1000)
  })
  it('returns NaN for non-numeric input (caller guards)', () => {
    expect(Number.isNaN(parseAmount('abc'))).toBe(true)
  })
})
