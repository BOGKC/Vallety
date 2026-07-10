import { describe, it, expect } from 'vitest'
import { parseAmount, parseDate, analyzeDuplicates, importRows, type ParsedRow } from './csvParser'
import { readTransactions, writeTransactions } from './transactions'
import { makeTxn } from '../../test/factories'

describe('parseAmount (Nordic/European number strings)', () => {
  it.each([
    ['12,30', 12.3],
    ['-12,30', -12.3],
    ['1 234,56', 1234.56],
    ['1.234,56', 1234.56],
    ['1234.56', 1234.56],
    ['', 0],
  ])('%s → %s', (raw, expected) => {
    expect(parseAmount(raw)).toBeCloseTo(expected, 6)
  })

  it('never returns NaN on garbage', () => {
    expect(parseAmount('not-a-number')).toBe(0)
  })
})

describe('parseDate', () => {
  it('parses dd.mm.yyyy, yyyy-mm-dd and dd/mm/yyyy to the same day', () => {
    expect(parseDate('15.06.2026').slice(0, 10)).toBe('2026-06-15')
    expect(parseDate('2026-06-15').slice(0, 10)).toBe('2026-06-15')
    expect(parseDate('15/06/2026').slice(0, 10)).toBe('2026-06-15')
  })
  it('expands 2-digit years to 20xx', () => {
    expect(parseDate('15.06.26').slice(0, 10)).toBe('2026-06-15')
  })
  it('falls back to a valid ISO date on unparseable input', () => {
    expect(Number.isNaN(new Date(parseDate('???')).getTime())).toBe(false)
  })
})

describe('analyzeDuplicates', () => {
  const row = (o: Partial<ParsedRow> = {}): ParsedRow => ({
    date: '2026-06-15T00:00:00.000Z', merchant: 'K-Market', amount: -20, type: 'expense', category: 'Groceries', ...o,
  })

  it('flags rows that already exist (by day+merchant+abs amount)', () => {
    writeTransactions([makeTxn({ date: '2026-06-15T09:00:00.000Z', merchant: 'K-Market', amount: 20 })])
    const a = analyzeDuplicates([row(), row({ merchant: 'Fresh One' })])
    expect(a.flags).toEqual([true, false])
    expect(a.duplicateCount).toBe(1)
    expect(a.uniqueCount).toBe(1)
  })

  it('treats in-file repeats as duplicates after the first', () => {
    writeTransactions([])
    const a = analyzeDuplicates([row(), row(), row()])
    expect(a.flags).toEqual([false, true, true])
  })
})

describe('importRows', () => {
  it('persists only unique rows and reports counts (no partial corruption)', () => {
    writeTransactions([])
    const outcome = importRows([
      { date: '2026-06-15T00:00:00.000Z', merchant: 'A', amount: -10, type: 'expense', category: 'Other' },
      { date: '2026-06-15T00:00:00.000Z', merchant: 'A', amount: -10, type: 'expense', category: 'Other' }, // dup
      { date: '2026-06-16T00:00:00.000Z', merchant: 'B', amount: 30, type: 'income', category: 'Other' },
    ])
    expect(outcome.added).toBe(2)
    expect(outcome.skipped).toBe(1)
    expect(readTransactions()).toHaveLength(2)
  })
})
