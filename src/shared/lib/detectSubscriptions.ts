import type { Txn } from './transactions'

export interface DetectedSubscription {
  merchant: string
  merchantKey: string
  amount: number // typical charge amount
  estimatedMonthlyAmount: number
  frequency: 'monthly' | 'annual'
  lastCharged: string // ISO
  previousAmount: number
  priceChanged: boolean
  count: number
}

/** Normalise a merchant name for grouping (case-insensitive, collapsed space). */
export function normalizeMerchant(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const DAY = 1000 * 60 * 60 * 24

/**
 * Detect recurring subscriptions from a list of transactions.
 * A merchant qualifies when it has ≥2 expense charges spaced at an
 * approximately monthly (28–31 days) or annual (360–370 days) cadence
 * with amounts within ±15% of each other.
 */
export function detectSubscriptions(transactions: Txn[]): DetectedSubscription[] {
  const groups = new Map<string, Txn[]>()
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const key = normalizeMerchant(t.merchant)
    if (!key) continue
    const bucket = groups.get(key)
    if (bucket) bucket.push(t)
    else groups.set(key, [t])
  }

  const detected: DetectedSubscription[] = []

  for (const [key, txns] of groups) {
    if (txns.length < 2) continue

    const sorted = [...txns].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const amounts = sorted.map((t) => Math.abs(Number(t.amount) || 0))

    // Amounts must be within ±15% of each other.
    const minAmt = Math.min(...amounts)
    const maxAmt = Math.max(...amounts)
    if (minAmt <= 0 || maxAmt > minAmt * 1.15) continue

    // Intervals between consecutive charges (days).
    const intervals: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      const days = (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / DAY
      intervals.push(days)
    }
    const med = median(intervals)

    let frequency: 'monthly' | 'annual' | null = null
    if (med >= 28 && med <= 31) frequency = 'monthly'
    else if (med >= 360 && med <= 370) frequency = 'annual'
    if (!frequency) continue

    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const lastAmount = amounts[amounts.length - 1]
    const previousAmount = amounts[amounts.length - 2]

    detected.push({
      merchant: sorted[sorted.length - 1].merchant,
      merchantKey: key,
      amount: avg,
      estimatedMonthlyAmount: frequency === 'monthly' ? avg : avg / 12,
      frequency,
      lastCharged: sorted[sorted.length - 1].date,
      previousAmount,
      priceChanged: lastAmount > previousAmount * 1.05,
      count: sorted.length,
    })
  }

  return detected.sort((a, b) => b.estimatedMonthlyAmount - a.estimatedMonthlyAmount)
}
