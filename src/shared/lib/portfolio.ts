// ── Investment portfolio data layer ──────────────────────────────────────────
// Manual-entry holdings (no live market feed in the MVP): the user records
// quantity, average cost, and updates the current price. Updating the price
// stores the previous one so "today's change" is real, not invented.

export const HOLDINGS_KEY = 'vallety_holdings'
export const WATCHLIST_KEY = 'vallety_watchlist'

export type HoldingType = 'stock' | 'etf' | 'fund' | 'crypto' | 'other'

export const HOLDING_TYPES: { value: HoldingType; label: string }[] = [
  { value: 'stock', label: 'Stock' },
  { value: 'etf', label: 'ETF' },
  { value: 'fund', label: 'Fund' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'other', label: 'Other' },
]

export interface Holding {
  id: string
  ticker: string
  name: string
  type: HoldingType
  quantity: number
  /** Average purchase price per unit, € */
  avgCost: number
  /** Latest price per unit, € (manually updated) */
  currentPrice: number
  /** Price before the latest update — powers "today's change" */
  prevPrice?: number
  /** Dividends received this year, € (manually tracked) */
  dividendsYtd?: number
  createdAt: string
}

export interface WatchItem {
  id: string
  ticker: string
  name: string
  note?: string
  createdAt: string
}

function readArray<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function writeArray<T>(key: string, value: T[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

let counter = 0
const newId = (p: string) => `${p}_${Date.now()}_${(counter += 1)}`

// ── Holdings CRUD ────────────────────────────────────────────────────────────

export const readHoldings = (): Holding[] => readArray<Holding>(HOLDINGS_KEY)

export function addHolding(input: Omit<Holding, 'id' | 'createdAt'>): Holding[] {
  const next = [...readHoldings(), { ...input, id: newId('hold'), createdAt: new Date().toISOString() }]
  writeArray(HOLDINGS_KEY, next)
  return next
}

export function updateHolding(id: string, patch: Partial<Holding>): Holding[] {
  const next = readHoldings().map((h) => {
    if (h.id !== id) return h
    // Price updates remember the previous price for the day-change figure.
    if (patch.currentPrice !== undefined && patch.currentPrice !== h.currentPrice) {
      return { ...h, ...patch, prevPrice: h.currentPrice }
    }
    return { ...h, ...patch }
  })
  writeArray(HOLDINGS_KEY, next)
  return next
}

export function deleteHolding(id: string): Holding[] {
  const next = readHoldings().filter((h) => h.id !== id)
  writeArray(HOLDINGS_KEY, next)
  return next
}

// ── Watchlist CRUD ───────────────────────────────────────────────────────────

export const readWatchlist = (): WatchItem[] => readArray<WatchItem>(WATCHLIST_KEY)

export function addWatchItem(input: Omit<WatchItem, 'id' | 'createdAt'>): WatchItem[] {
  const next = [...readWatchlist(), { ...input, id: newId('watch'), createdAt: new Date().toISOString() }]
  writeArray(WATCHLIST_KEY, next)
  return next
}

export function deleteWatchItem(id: string): WatchItem[] {
  const next = readWatchlist().filter((w) => w.id !== id)
  writeArray(WATCHLIST_KEY, next)
  return next
}

// ── Analytics ────────────────────────────────────────────────────────────────

export const holdingValue = (h: Holding): number => h.quantity * h.currentPrice
export const holdingCost = (h: Holding): number => h.quantity * h.avgCost
export const holdingGain = (h: Holding): number => holdingValue(h) - holdingCost(h)
export const holdingGainPct = (h: Holding): number =>
  holdingCost(h) > 0 ? (holdingGain(h) / holdingCost(h)) * 100 : 0

export interface PortfolioSummary {
  totalValue: number
  totalInvested: number
  gain: number
  gainPct: number
  /** Change since the previous recorded prices, € */
  dayChange: number
  dayChangePct: number
  dividendsYtd: number
  /** Value by holding type, for the allocation donut */
  allocation: { type: HoldingType; label: string; value: number }[]
  /** Sorted by gain% — best first */
  movers: Holding[]
  /** Largest holding's share of the portfolio (concentration) */
  topConcentrationPct: number
}

export function computePortfolio(holdings: Holding[]): PortfolioSummary {
  const totalValue = holdings.reduce((a, h) => a + holdingValue(h), 0)
  const totalInvested = holdings.reduce((a, h) => a + holdingCost(h), 0)
  const gain = totalValue - totalInvested
  const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0

  const prevValue = holdings.reduce((a, h) => a + h.quantity * (h.prevPrice ?? h.currentPrice), 0)
  const dayChange = totalValue - prevValue
  const dayChangePct = prevValue > 0 ? (dayChange / prevValue) * 100 : 0

  const dividendsYtd = holdings.reduce((a, h) => a + (Number(h.dividendsYtd) || 0), 0)

  const byType = new Map<HoldingType, number>()
  for (const h of holdings) byType.set(h.type, (byType.get(h.type) ?? 0) + holdingValue(h))
  const allocation = HOLDING_TYPES
    .map((t) => ({ type: t.value, label: t.label, value: byType.get(t.value) ?? 0 }))
    .filter((a) => a.value > 0)

  const movers = [...holdings].sort((a, b) => holdingGainPct(b) - holdingGainPct(a))

  const largest = holdings.reduce((max, h) => Math.max(max, holdingValue(h)), 0)
  const topConcentrationPct = totalValue > 0 ? (largest / totalValue) * 100 : 0

  return {
    totalValue, totalInvested, gain, gainPct,
    dayChange, dayChangePct, dividendsYtd,
    allocation, movers, topConcentrationPct,
  }
}
