import {
  differenceInCalendarDays, format, startOfMonth, addMonths,
} from 'date-fns'

// ── Storage ─────────────────────────────────────────────────────────────────

export const BILLS_KEY = 'vallety_bills'

export type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'annually'

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annual',
}

export interface Bill {
  id: string
  name: string
  amount: number
  frequency: Frequency
  nextDue: string // ISO
  category: string
  isTrial?: boolean
  trialEndsOn?: string // ISO
  paused?: boolean
  paidMonths?: string[] // 'yyyy-MM' keys marked paid
  createdAt: string
}

function normalize(raw: unknown): Bill | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const amount = Number(r.amount)
  if (!Number.isFinite(amount)) return null
  const freq = (['weekly', 'monthly', 'quarterly', 'annually'] as const).includes(r.frequency as Frequency)
    ? (r.frequency as Frequency)
    : 'monthly'
  return {
    id: String(r.id ?? `bill_${Date.now()}`),
    name: String(r.name ?? 'Bill'),
    amount: Math.abs(amount),
    frequency: freq,
    nextDue: String(r.nextDue ?? new Date().toISOString()),
    category: String(r.category ?? 'Bills'),
    isTrial: Boolean(r.isTrial),
    trialEndsOn: r.trialEndsOn ? String(r.trialEndsOn) : undefined,
    paused: Boolean(r.paused),
    paidMonths: Array.isArray(r.paidMonths) ? (r.paidMonths as string[]) : [],
    createdAt: String(r.createdAt ?? new Date().toISOString()),
  }
}

export function readBills(): Bill[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(BILLS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalize).filter((b): b is Bill => b !== null)
  } catch {
    return []
  }
}

export function writeBills(bills: Bill[]): void {
  try {
    window.localStorage.setItem(BILLS_KEY, JSON.stringify(bills))
  } catch {
    /* ignore */
  }
}

export function addBill(input: Omit<Bill, 'id' | 'createdAt' | 'paidMonths'>): Bill[] {
  const bill: Bill = {
    ...input,
    amount: Math.abs(input.amount),
    paidMonths: [],
    id: `bill_${Date.now()}_${Math.floor(performance.now())}`,
    createdAt: new Date().toISOString(),
  }
  const next = [...readBills(), bill]
  writeBills(next)
  return next
}

export function updateBill(id: string, patch: Partial<Bill>): Bill[] {
  const next = readBills().map((b) => (b.id === id ? { ...b, ...patch } : b))
  writeBills(next)
  return next
}

export function deleteBill(id: string): Bill[] {
  const next = readBills().filter((b) => b.id !== id)
  writeBills(next)
  return next
}

export function markBillPaid(id: string, now: Date): Bill[] {
  const key = format(now, 'yyyy-MM')
  const next = readBills().map((b) => {
    if (b.id !== id) return b
    const months = new Set(b.paidMonths ?? [])
    months.add(key)
    return { ...b, paidMonths: Array.from(months) }
  })
  writeBills(next)
  return next
}

// ── Amount helpers ────────────────────────────────────────────────────────────

export function monthlyAmount(b: Bill): number {
  switch (b.frequency) {
    case 'weekly': return (b.amount * 52) / 12
    case 'quarterly': return b.amount / 3
    case 'annually': return b.amount / 12
    case 'monthly':
    default: return b.amount
  }
}

export function annualAmount(b: Bill): number {
  switch (b.frequency) {
    case 'weekly': return b.amount * 52
    case 'quarterly': return b.amount * 4
    case 'annually': return b.amount
    case 'monthly':
    default: return b.amount * 12
  }
}

// ── Defaults ──────────────────────────────────────────────────────────────────

/** First of next month, as a yyyy-MM-dd value for a date input. */
export function defaultDueDate(now: Date): string {
  return format(startOfMonth(addMonths(now, 1)), 'yyyy-MM-dd')
}

// ── Derived views ─────────────────────────────────────────────────────────────

export function monthKey(now: Date): string {
  return format(now, 'yyyy-MM')
}

export function isPaidThisMonth(b: Bill, now: Date): boolean {
  return (b.paidMonths ?? []).includes(monthKey(now))
}

export function daysUntilDue(b: Bill, now: Date): number {
  const d = new Date(b.nextDue)
  if (Number.isNaN(d.getTime())) return 9999
  return differenceInCalendarDays(d, now)
}

export interface BillsSummary {
  monthlyRecurring: number
  dueThisWeekCount: number
  dueThisWeekTotal: number
  annualTotal: number
  activeTrials: number
}

export function computeSummary(bills: Bill[], now: Date): BillsSummary {
  const active = bills.filter((b) => !b.paused)
  const monthlyRecurring = active.reduce((a, b) => a + monthlyAmount(b), 0)
  const annualTotal = active.reduce((a, b) => a + annualAmount(b), 0)

  const dueThisWeek = active.filter((b) => {
    if (isPaidThisMonth(b, now)) return false
    const d = daysUntilDue(b, now)
    return d <= 7
  })

  const activeTrials = bills.filter(
    (b) => b.isTrial && b.trialEndsOn && new Date(b.trialEndsOn) >= now && !b.paused
  ).length

  return {
    monthlyRecurring,
    dueThisWeekCount: dueThisWeek.length,
    dueThisWeekTotal: dueThisWeek.reduce((a, b) => a + b.amount, 0),
    annualTotal,
    activeTrials,
  }
}

export interface TimelineGroups {
  thisWeek: Bill[]
  nextWeek: Bill[]
  laterThisMonth: Bill[]
}

/** Active, unpaid bills due within ~30 days, grouped by urgency window. */
export function timelineGroups(bills: Bill[], now: Date): TimelineGroups {
  const upcoming = bills
    .filter((b) => !b.paused && !isPaidThisMonth(b, now) && daysUntilDue(b, now) <= 30)
    .sort((a, b) => daysUntilDue(a, now) - daysUntilDue(b, now))

  const groups: TimelineGroups = { thisWeek: [], nextWeek: [], laterThisMonth: [] }
  for (const b of upcoming) {
    const d = daysUntilDue(b, now)
    if (d <= 7) groups.thisWeek.push(b)
    else if (d <= 14) groups.nextWeek.push(b)
    else groups.laterThisMonth.push(b)
  }
  return groups
}

export function paidThisMonth(bills: Bill[], now: Date): Bill[] {
  return bills.filter((b) => !b.paused && isPaidThisMonth(b, now))
}

export function activeRecurring(bills: Bill[]): Bill[] {
  return bills
    .filter((b) => !b.paused)
    .sort((a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime())
}
