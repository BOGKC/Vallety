import { addMonths } from 'date-fns'

// ── Storage ─────────────────────────────────────────────────────────────────

export const DEBTS_KEY = 'vallety_debts'

export type DebtType = 'credit_card' | 'loan' | 'mortgage' | 'other'
export type Strategy = 'snowball' | 'avalanche'

export interface Debt {
  id: string
  name: string
  type: DebtType
  balance: number
  rate: number // annual %
  minPayment: number
  createdAt: string
}

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  credit_card: 'Credit card',
  loan: 'Loan',
  mortgage: 'Mortgage',
  other: 'Other',
}

function normalize(raw: unknown): Debt | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const balance = Number(r.balance)
  if (!Number.isFinite(balance)) return null
  const type = (['credit_card', 'loan', 'mortgage', 'other'] as const).includes(r.type as DebtType)
    ? (r.type as DebtType)
    : 'other'
  return {
    id: String(r.id ?? `debt_${Date.now()}`),
    name: String(r.name ?? 'Debt'),
    type,
    balance: Math.abs(balance),
    rate: Math.max(0, Number(r.rate) || 0),
    minPayment: Math.max(0, Number(r.minPayment) || 0),
    createdAt: String(r.createdAt ?? new Date().toISOString()),
  }
}

export function readDebts(): Debt[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(DEBTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalize).filter((d): d is Debt => d !== null)
  } catch {
    return []
  }
}

export function writeDebts(debts: Debt[]): void {
  try {
    window.localStorage.setItem(DEBTS_KEY, JSON.stringify(debts))
  } catch {
    /* ignore */
  }
}

export function addDebt(input: Omit<Debt, 'id' | 'createdAt'>): Debt[] {
  const debt: Debt = {
    ...input,
    balance: Math.abs(input.balance),
    id: `debt_${Date.now()}_${Math.floor(performance.now())}`,
    createdAt: new Date().toISOString(),
  }
  const next = [...readDebts(), debt]
  writeDebts(next)
  return next
}

export function deleteDebt(id: string): Debt[] {
  const next = readDebts().filter((d) => d.id !== id)
  writeDebts(next)
  return next
}

// ── Strategy ordering ─────────────────────────────────────────────────────────

export function sortByStrategy(debts: Debt[], strategy: Strategy): Debt[] {
  const arr = [...debts]
  if (strategy === 'snowball') return arr.sort((a, b) => a.balance - b.balance)
  return arr.sort((a, b) => b.rate - a.rate) // avalanche: highest interest first
}

// ── Payoff simulation ─────────────────────────────────────────────────────────

export interface PayoffResult {
  payable: boolean
  months: number // Infinity when not payable
  totalInterest: number
  debtFreeDate: Date | null
  order: string[]
  payoff: Record<string, { months: number; date: Date }>
}

const SIM_CAP = 1200 // 100 years — guards against non-amortising debts

/**
 * Month-by-month debt simulation. A constant monthly budget (sum of all
 * minimum payments + extra) is applied: minimums first, then any surplus is
 * funnelled to debts in the active strategy order (rolling over as each clears).
 */
export function simulatePayoff(
  debts: Debt[],
  strategy: Strategy,
  extra: number,
  now: Date
): PayoffResult {
  if (debts.length === 0) {
    return { payable: true, months: 0, totalInterest: 0, debtFreeDate: null, order: [], payoff: {} }
  }

  const sorted = sortByStrategy(debts, strategy)
  const order = sorted.map((d) => d.id)
  const state = sorted.map((d) => ({ id: d.id, balance: d.balance, rate: d.rate, min: d.minPayment }))
  const budget = debts.reduce((a, d) => a + d.minPayment, 0) + Math.max(0, extra)

  const payoff: Record<string, { months: number; date: Date }> = {}
  let totalInterest = 0
  let month = 0

  while (state.some((s) => s.balance > 0.005) && month < SIM_CAP) {
    month++
    const before = state.reduce((a, s) => a + s.balance, 0)

    // Accrue interest
    for (const s of state) {
      if (s.balance > 0.005) {
        const i = s.balance * (s.rate / 1200)
        s.balance += i
        totalInterest += i
      }
    }

    // Pay minimums
    let available = budget
    for (const s of state) {
      if (s.balance > 0.005) {
        const pay = Math.min(s.min, s.balance)
        s.balance -= pay
        available -= pay
      }
    }
    if (available < 0) available = 0

    // Funnel surplus in strategy order (state is already sorted)
    for (const s of state) {
      if (available <= 0) break
      if (s.balance > 0.005) {
        const pay = Math.min(available, s.balance)
        s.balance -= pay
        available -= pay
      }
    }

    // Record any debts cleared this month
    for (const s of state) {
      if (s.balance <= 0.005 && !payoff[s.id]) {
        payoff[s.id] = { months: month, date: addMonths(now, month) }
      }
    }

    // Stagnation guard (minimums can't cover interest, no surplus reaching it)
    const after = state.reduce((a, s) => a + s.balance, 0)
    if (after >= before - 0.005) break
  }

  const payable = state.every((s) => s.balance <= 0.005)
  return {
    payable,
    months: payable ? month : Infinity,
    totalInterest,
    debtFreeDate: payable ? addMonths(now, month) : null,
    order,
    payoff,
  }
}
