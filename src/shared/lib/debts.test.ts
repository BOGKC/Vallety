import { describe, it, expect } from 'vitest'
import { sortByStrategy, simulatePayoff, type Debt } from './debts'

const debt = (o: Partial<Debt>): Debt => ({
  id: Math.random().toString(36), name: 'D', type: 'other',
  balance: 1000, rate: 10, minPayment: 50, createdAt: '2026-01-01T00:00:00.000Z', ...o,
})

describe('sortByStrategy', () => {
  const debts = [
    debt({ name: 'Big/Low', balance: 10000, rate: 4 }),
    debt({ name: 'Small/High', balance: 500, rate: 22 }),
    debt({ name: 'Mid', balance: 3000, rate: 12 }),
  ]

  it('snowball orders by smallest balance first', () => {
    expect(sortByStrategy(debts, 'snowball').map((d) => d.name)).toEqual(['Small/High', 'Mid', 'Big/Low'])
  })

  it('avalanche orders by highest interest rate first', () => {
    expect(sortByStrategy(debts, 'avalanche').map((d) => d.name)).toEqual(['Small/High', 'Mid', 'Big/Low'])
  })

  it('does not mutate the input array', () => {
    const input = [...debts]
    sortByStrategy(input, 'snowball')
    expect(input.map((d) => d.name)).toEqual(['Big/Low', 'Small/High', 'Mid'])
  })
})

describe('simulatePayoff', () => {
  const NOW = new Date('2026-01-01T00:00:00.000Z')

  it('no debts → payable, zero months, no interest', () => {
    expect(simulatePayoff([], 'snowball', 0, NOW)).toMatchObject({
      payable: true, months: 0, totalInterest: 0,
    })
  })

  it('interest-free debt pays off in balance / payment months', () => {
    const r = simulatePayoff([debt({ balance: 1000, rate: 0, minPayment: 100 })], 'snowball', 0, NOW)
    expect(r.payable).toBe(true)
    expect(r.months).toBe(10)
    expect(r.totalInterest).toBeCloseTo(0, 6)
  })

  it('accrues interest on a rate-bearing debt', () => {
    const r = simulatePayoff([debt({ balance: 1000, rate: 12, minPayment: 100 })], 'snowball', 0, NOW)
    expect(r.payable).toBe(true)
    expect(r.totalInterest).toBeGreaterThan(0)
    expect(r.debtFreeDate).toBeInstanceOf(Date)
  })

  it('extra payments shorten the payoff', () => {
    const base = simulatePayoff([debt({ balance: 2000, rate: 10, minPayment: 100 })], 'snowball', 0, NOW)
    const faster = simulatePayoff([debt({ balance: 2000, rate: 10, minPayment: 100 })], 'snowball', 200, NOW)
    expect(faster.months).toBeLessThan(base.months)
  })

  it('flags a non-amortising debt (minimum below interest) as not payable', () => {
    // 20000 @ 24% → ~400/mo interest, min only 100 and no extra → never clears.
    const r = simulatePayoff([debt({ balance: 20000, rate: 24, minPayment: 100 })], 'avalanche', 0, NOW)
    expect(r.payable).toBe(false)
    expect(r.months).toBe(Infinity)
    expect(r.debtFreeDate).toBeNull()
  })

  it('rolls a cleared debt’s payment onto the next (snowball)', () => {
    const r = simulatePayoff(
      [debt({ name: 'small', balance: 200, rate: 0, minPayment: 100 }),
       debt({ name: 'big', balance: 1000, rate: 0, minPayment: 100 })],
      'snowball', 0, NOW,
    )
    // Combined budget 200/mo; total 1200 → 6 months with rollover.
    expect(r.payable).toBe(true)
    expect(r.months).toBe(6)
  })
})
