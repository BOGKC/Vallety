import { describe, it, expect } from 'vitest'
import {
  invoiceGross, invoiceVat, computeBusinessSummary, VAT_RATES, ADVANCE_TAX_RATE,
} from './business'
import { PROFILE_KEY, DEFAULT_PROFILE } from './profile'
import { makeInvoice, makeExpense } from '../../test/factories'

const NOW = new Date('2026-06-15T12:00:00.000Z')

function setProfile(patch: Record<string, unknown>) {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...DEFAULT_PROFILE, ...patch }))
}

describe('ALV (Finnish VAT) math', () => {
  it('exposes the four statutory rates', () => {
    expect([...VAT_RATES]).toEqual([25.5, 14, 10, 0])
  })

  it.each([
    [25.5, 1000, 1255, 255],
    [14, 1000, 1140, 140],
    [10, 1000, 1100, 100],
    [0, 1000, 1000, 0],
  ])('rate %s%%: gross and VAT are exact', (vatRate, amount, gross, vat) => {
    const inv = makeInvoice({ amount, vatRate })
    expect(invoiceGross(inv)).toBeCloseTo(gross, 6)
    expect(invoiceVat(inv)).toBeCloseTo(vat, 6)
  })

  it('gross always equals net + VAT', () => {
    for (const vatRate of VAT_RATES) {
      const inv = makeInvoice({ amount: 823.45, vatRate })
      expect(invoiceGross(inv)).toBeCloseTo(inv.amount + invoiceVat(inv), 6)
    }
  })
})

describe('computeBusinessSummary', () => {
  it('returns all-zero and never NaN with no data', () => {
    const s = computeBusinessSummary([], [], NOW)
    for (const v of Object.values(s)) expect(Number.isNaN(v as number)).toBe(false)
    expect(s.revenueMonth).toBe(0)
    expect(s.outstanding).toBe(0)
    expect(s.vatOwed).toBe(0)
    expect(s.safeToPay).toBe(0)
    expect(s.profitYtd).toBe(0)
  })

  it('counts only paid invoices as revenue, sent as outstanding (gross)', () => {
    const invoices = [
      makeInvoice({ amount: 1000, vatRate: 25.5, status: 'paid', paidAt: '2026-06-10T00:00:00.000Z' }),
      makeInvoice({ amount: 500, vatRate: 25.5, status: 'sent' }),
      makeInvoice({ amount: 200, vatRate: 25.5, status: 'draft' }),
    ]
    const s = computeBusinessSummary(invoices, [], NOW)
    expect(s.revenueMonth).toBe(1000) // net
    expect(s.outstandingCount).toBe(1)
    expect(s.outstanding).toBeCloseTo(500 * 1.255, 6) // gross
  })

  it('VAT owed = collected − deductible, floored at zero', () => {
    const invoices = [makeInvoice({ amount: 1000, vatRate: 25.5, status: 'paid', paidAt: '2026-03-01T00:00:00.000Z' })]
    const expenses = [makeExpense({ amount: 100, vatRate: 25.5, date: '2026-02-01T00:00:00.000Z' })]
    const s = computeBusinessSummary(invoices, expenses, NOW)
    expect(s.vatOwed).toBeCloseTo(255 - 25.5, 6)
  })

  it('advance tax = 25% of YTD profit', () => {
    const invoices = [makeInvoice({ amount: 2000, vatRate: 0, status: 'paid', paidAt: '2026-02-01T00:00:00.000Z' })]
    const expenses = [makeExpense({ amount: 400, vatRate: 0, date: '2026-02-02T00:00:00.000Z' })]
    const s = computeBusinessSummary(invoices, expenses, NOW)
    expect(s.profitYtd).toBe(1600)
    expect(s.advanceTaxYtd).toBeCloseTo(1600 * ADVANCE_TAX_RATE, 6)
  })

  it.each([
    ['under53', 0.241],
    ['53-62', 0.256],
    ['over62', 0.241],
  ])('YEL monthly for %s bracket = income * rate / 12', (bracket, rate) => {
    setProfile({ yel_income: '30000', age_bracket: bracket })
    const s = computeBusinessSummary([], [], NOW)
    expect(s.yelMonthly).toBeCloseTo((30000 * rate) / 12, 4)
  })

  it('accepts comma-decimal YEL income (Finnish keyboard)', () => {
    setProfile({ yel_income: '30000,50', age_bracket: 'under53' })
    const s = computeBusinessSummary([], [], NOW)
    expect(s.yelMonthly).toBeCloseTo((30000.5 * 0.241) / 12, 4)
  })

  it('safe-to-pay = month profit − VAT − advance tax − YEL, end to end', () => {
    setProfile({ yel_income: '24000', age_bracket: 'under53' })
    const invoices = [makeInvoice({ amount: 5000, vatRate: 25.5, status: 'paid', paidAt: '2026-06-05T00:00:00.000Z' })]
    const expenses = [makeExpense({ amount: 1000, vatRate: 25.5, date: '2026-06-06T00:00:00.000Z' })]
    const s = computeBusinessSummary(invoices, expenses, NOW)

    const profitMonth = 5000 - 1000
    const vatMonth = 5000 * 0.255 - 1000 * 0.255
    const advanceTaxMonth = profitMonth * ADVANCE_TAX_RATE
    const yelMonthly = (24000 * 0.241) / 12
    const expected = profitMonth - vatMonth - advanceTaxMonth - yelMonthly

    expect(s.safeToPay).toBeCloseTo(expected, 4)
  })

  it('ignores invoices/expenses dated outside the current month for the monthly figures', () => {
    const invoices = [makeInvoice({ amount: 1000, vatRate: 0, status: 'paid', paidAt: '2026-01-10T00:00:00.000Z' })]
    const s = computeBusinessSummary(invoices, [], NOW)
    expect(s.revenueMonth).toBe(0) // January, not June
    expect(s.profitYtd).toBe(1000) // but still counts YTD
  })
})
