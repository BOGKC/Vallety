import { describe, it, expect } from 'vitest'
import {
  applyFilters, filtersAreActive, suggestCategory, hexToRgba,
  addTransaction, updateTransaction, deleteTransaction, readTransactions,
  DEFAULT_FILTERS, type Filters,
} from './transactions'
import { makeTxn } from '../../test/factories'

const NOW = new Date('2026-06-15T12:00:00.000Z')
const f = (o: Partial<Filters> = {}): Filters => ({ ...DEFAULT_FILTERS, ...o })

describe('applyFilters', () => {
  const txns = [
    makeTxn({ merchant: 'K-Market', category: 'Groceries', type: 'expense', amount: 20, date: '2026-06-10T00:00:00.000Z' }),
    makeTxn({ merchant: 'Salary', category: 'Income', type: 'income', amount: 3000, date: '2026-06-01T00:00:00.000Z' }),
    makeTxn({ merchant: 'Netflix', category: 'Entertainment', type: 'expense', amount: 13, date: '2026-05-02T00:00:00.000Z' }),
  ]

  it('filters by type', () => {
    expect(applyFilters(txns, f({ type: 'income' }), NOW)).toHaveLength(1)
    expect(applyFilters(txns, f({ type: 'expense' }), NOW)).toHaveLength(2)
  })
  it('filters by category', () => {
    expect(applyFilters(txns, f({ category: 'Groceries' }), NOW)).toHaveLength(1)
  })
  it('filters by date preset (this-month)', () => {
    expect(applyFilters(txns, f({ datePreset: 'this-month' }), NOW)).toHaveLength(2) // June only
  })
  it('searches merchant/category/notes', () => {
    expect(applyFilters(txns, f({ search: 'netflix' }), NOW)).toHaveLength(1)
  })
  it('combines filters (AND)', () => {
    const r = applyFilters(txns, f({ type: 'expense', datePreset: 'this-month' }), NOW)
    expect(r.map((t) => t.merchant)).toEqual(['K-Market'])
  })
  it('all-time + no query returns everything', () => {
    expect(applyFilters(txns, f(), NOW)).toHaveLength(3)
  })
})

describe('filtersAreActive', () => {
  it('false for defaults, true when any filter set', () => {
    expect(filtersAreActive(DEFAULT_FILTERS)).toBe(false)
    expect(filtersAreActive(f({ search: 'x' }))).toBe(true)
    expect(filtersAreActive(f({ type: 'income' }))).toBe(true)
  })
})

describe('suggestCategory (auto-categorization)', () => {
  it('reuses the category of a prior transaction from the same merchant', () => {
    const prior = [makeTxn({ merchant: 'Ravintola Kolme', category: 'Dining' })]
    expect(suggestCategory('ravintola kolme', prior)).toBe('Dining')
  })
  it('falls back to Other for an unknown merchant', () => {
    expect(suggestCategory('Totally Unknown XYZ', [])).toBe('Other')
  })
  it('returns Other for empty input', () => {
    expect(suggestCategory('   ', [])).toBe('Other')
  })
})

describe('hexToRgba', () => {
  it('converts hex to rgba', () => {
    expect(hexToRgba('#3B5BDB', 0.5)).toBe('rgba(59, 91, 219, 0.5)')
  })
})

describe('transaction CRUD persistence', () => {
  it('add → read round-trips and stores abs amount', () => {
    addTransaction({ type: 'expense', amount: -42, merchant: 'X', category: 'Other', date: NOW.toISOString() })
    const list = readTransactions()
    expect(list).toHaveLength(1)
    expect(list[0].amount).toBe(42)
  })
  it('update persists the change', () => {
    const list = addTransaction({ type: 'expense', amount: 10, merchant: 'X', category: 'Other', date: NOW.toISOString() })
    updateTransaction(list[0].id, { merchant: 'Renamed' })
    expect(readTransactions()[0].merchant).toBe('Renamed')
  })
  it('delete removes the row', () => {
    const list = addTransaction({ type: 'expense', amount: 10, merchant: 'X', category: 'Other', date: NOW.toISOString() })
    deleteTransaction(list[0].id)
    expect(readTransactions()).toHaveLength(0)
  })
})
