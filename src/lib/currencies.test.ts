import { describe, it, expect } from 'vitest'
import {
  CURRENCIES, CURRENCY_REGIONS, getCurrency, currencyDecimals, currencySymbol,
  isSupportedCurrency, searchCurrencies, groupedCurrencies,
} from './currencies'

const REQUIRED = [
  'EUR','USD','GBP','SEK','NOK','DKK','ISK','CHF','PLN','CZK','HUF','RON','BGN',
  'JPY','CNY','INR','AUD','CAD','NZD','SGD','HKD','KRW','AED','SAR','TRY','ZAR',
  'BRL','MXN','UAH','THB','MYR','IDR','PHP',
]

describe('currency catalogue', () => {
  it('includes every required currency', () => {
    const codes = new Set(CURRENCIES.map((c) => c.code))
    for (const code of REQUIRED) expect(codes.has(code)).toBe(true)
  })

  it('every entry has a code, name, symbol and numeric decimal_places', () => {
    for (const c of CURRENCIES) {
      expect(c.code).toMatch(/^[A-Z]{3}$/)
      expect(c.name.length).toBeGreaterThan(0)
      expect(c.symbol.length).toBeGreaterThan(0)
      expect([0, 2, 3]).toContain(c.decimal_places)
    }
  })

  it('marks no-decimal currencies as 0 places', () => {
    for (const code of ['JPY', 'KRW', 'ISK', 'HUF', 'IDR']) {
      expect(currencyDecimals(code)).toBe(0)
    }
    expect(currencyDecimals('EUR')).toBe(2)
    expect(currencyDecimals('USD')).toBe(2)
  })

  it('getCurrency is case-insensitive; unknown → undefined', () => {
    expect(getCurrency('eur')?.name).toBe('Euro')
    expect(getCurrency('ZZZ')).toBeUndefined()
  })

  it('symbol falls back to the code for unknown currencies', () => {
    expect(currencySymbol('EUR')).toBe('€')
    expect(currencySymbol('ZZZ')).toBe('ZZZ')
  })

  it('isSupportedCurrency', () => {
    expect(isSupportedCurrency('SEK')).toBe(true)
    expect(isSupportedCurrency('zzz')).toBe(false)
    expect(isSupportedCurrency(null)).toBe(false)
  })
})

describe('searchCurrencies', () => {
  it('"kro" matches the krona/krone family', () => {
    const codes = searchCurrencies('kro').map((c) => c.code)
    expect(codes).toEqual(expect.arrayContaining(['SEK', 'NOK', 'DKK', 'ISK']))
  })
  it('matches by code and by name', () => {
    expect(searchCurrencies('yen').map((c) => c.code)).toContain('JPY')
    expect(searchCurrencies('gbp').map((c) => c.code)).toContain('GBP')
  })
  it('empty query returns the full list', () => {
    expect(searchCurrencies('').length).toBe(CURRENCIES.length)
  })
})

describe('region grouping', () => {
  it('lists the five regions with Eurozone & Nordics first', () => {
    expect(CURRENCY_REGIONS.map((r) => r.label)).toEqual([
      'Eurozone & Nordics',
      'Rest of Europe',
      'Americas',
      'Asia-Pacific',
      'Middle East & Africa',
    ])
  })

  it('Eurozone & Nordics contains exactly the expected currencies', () => {
    const codes = CURRENCY_REGIONS[0].currencies.map((c) => c.code)
    expect(codes).toEqual(['EUR', 'SEK', 'NOK', 'DKK', 'ISK'])
  })

  it('every catalogue currency belongs to exactly one region', () => {
    const grouped = CURRENCY_REGIONS.flatMap((r) => r.currencies.map((c) => c.code))
    expect(grouped.sort()).toEqual(CURRENCIES.map((c) => c.code).sort())
    expect(new Set(grouped).size).toBe(grouped.length) // no dupes
  })

  it('groupedCurrencies filters within regions and drops empty ones', () => {
    const groups = groupedCurrencies('kro')
    // Only the Eurozone & Nordics region has krona/krone matches.
    expect(groups.map((r) => r.label)).toEqual(['Eurozone & Nordics'])
    expect(groups[0].currencies.map((c) => c.code)).toEqual(
      expect.arrayContaining(['SEK', 'NOK', 'DKK', 'ISK']),
    )
  })

  it('groupedCurrencies with no query returns all regions', () => {
    expect(groupedCurrencies('').length).toBe(CURRENCY_REGIONS.length)
  })
})
