import { describe, it, expect } from 'vitest'
import { formatEuro, formatCurrency, parseAmount } from './formatters'

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

describe('formatCurrency', () => {
  const en = 'en-US'
  it('formats with the correct symbol and 2 decimals for standard currencies', () => {
    expect(formatCurrency(1234.5, 'USD', { locale: en })).toBe('$1,234.50')
    expect(formatCurrency(1234.5, 'GBP', { locale: en })).toBe('£1,234.50')
  })

  it('renders no-decimal currencies as whole numbers (no cents)', () => {
    expect(formatCurrency(1234.5, 'JPY', { locale: en })).toBe('¥1,235')
    expect(formatCurrency(1000, 'KRW', { locale: en })).toBe('₩1,000')
    // ISK/HUF are also zero-decimal
    expect(formatCurrency(1234.9, 'ISK', { locale: en })).not.toMatch(/[.,]\d\d$/)
    expect(formatCurrency(1234.9, 'HUF', { locale: en })).not.toMatch(/[.,]\d\d$/)
  })

  it('puts the minus sign ahead of the symbol and never shows -0', () => {
    expect(formatCurrency(-1234.5, 'USD', { locale: en })).toBe('-$1,234.50')
    expect(formatCurrency(-0.3, 'USD', { locale: en, decimals: 0 })).toBe('$0')
    expect(formatCurrency(-0.004, 'EUR', { locale: en })).toBe('€0.00')
  })

  it('honours a decimals override for compact totals', () => {
    expect(formatCurrency(1234.5, 'USD', { locale: en, decimals: 0 })).toBe('$1,235')
  })

  it('guards non-finite input', () => {
    expect(formatCurrency(NaN, 'USD', { locale: en })).toBe('$0.00')
  })

  it('does not crash on an unknown currency (renders the code + amount)', () => {
    const out = formatCurrency(1000, 'ZZZ', { locale: en })
    expect(out).toContain('ZZZ')
    expect(out).toContain('1,000.00')
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
