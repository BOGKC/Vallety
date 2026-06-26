import {
  ShoppingCart, Utensils, Car, ShoppingBag, Receipt, Tv, Heart,
  Home, Plane, TrendingUp, Zap, MoreHorizontal, type LucideIcon,
} from 'lucide-react'
import {
  format, isToday, isYesterday, isThisWeek, startOfMonth, endOfMonth,
  subMonths, isWithinInterval,
} from 'date-fns'

// ── Storage ─────────────────────────────────────────────────────────────────

export const TRANSACTIONS_KEY = 'vallety_transactions'

export type TxnType = 'income' | 'expense'

export interface Txn {
  id: string
  type: TxnType
  amount: number
  merchant: string
  category: string
  date: string // ISO
  notes?: string
  account?: string
}

/** Tolerant normaliser: the stored shape may use `description`/`name`. */
function normalize(raw: unknown): Txn | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const amount = Number(r.amount)
  if (!Number.isFinite(amount)) return null
  const type: TxnType = r.type === 'income' ? 'income' : 'expense'
  return {
    id: String(r.id ?? `${Date.now()}-${Math.round(amount * 1000)}`),
    type,
    amount: Math.abs(amount),
    merchant: String(r.merchant ?? r.description ?? r.name ?? 'Untitled'),
    category: String(r.category ?? 'Other'),
    date: String(r.date ?? new Date().toISOString()),
    notes: r.notes != null ? String(r.notes) : undefined,
    account: r.account != null ? String(r.account) : 'Manual entry',
  }
}

export function readTransactions(): Txn[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(TRANSACTIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalize).filter((t): t is Txn => t !== null)
  } catch {
    return []
  }
}

export function writeTransactions(txns: Txn[]): void {
  try {
    window.localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txns))
  } catch {
    /* ignore quota / unavailable storage */
  }
}

function makeId(): string {
  return `txn_${Date.now()}_${Math.floor(performance.now())}`
}

export function addTransaction(input: Omit<Txn, 'id'>): Txn[] {
  const txn: Txn = { ...input, id: makeId(), amount: Math.abs(input.amount) }
  const next = [txn, ...readTransactions()]
  writeTransactions(next)
  return next
}

export function updateTransaction(id: string, patch: Partial<Txn>): Txn[] {
  const next = readTransactions().map((t) =>
    t.id === id ? { ...t, ...patch, amount: Math.abs(patch.amount ?? t.amount) } : t
  )
  writeTransactions(next)
  return next
}

export function deleteTransaction(id: string): Txn[] {
  const next = readTransactions().filter((t) => t.id !== id)
  writeTransactions(next)
  return next
}

// ── Categories ──────────────────────────────────────────────────────────────

interface CategoryMeta {
  color: string
  icon: LucideIcon
}

export const CATEGORIES: Record<string, CategoryMeta> = {
  Groceries: { color: '#22C55E', icon: ShoppingCart },
  Dining: { color: '#F59E0B', icon: Utensils },
  Transport: { color: '#3B82F6', icon: Car },
  Housing: { color: '#9333EA', icon: Home },
  Healthcare: { color: '#EF4444', icon: Heart },
  Entertainment: { color: '#EC4899', icon: Tv },
  Shopping: { color: '#F97316', icon: ShoppingBag },
  Utilities: { color: '#6366F1', icon: Zap },
  Income: { color: '#22C55E', icon: TrendingUp },
  Other: { color: '#64748B', icon: MoreHorizontal },
  // Extra aliases tolerated from imported / legacy data
  Bills: { color: '#EF4444', icon: Receipt },
  Health: { color: '#EF4444', icon: Heart },
  Travel: { color: '#6366F1', icon: Plane },
  Salary: { color: '#22C55E', icon: TrendingUp },
}

const FALLBACK: CategoryMeta = { color: '#64748B', icon: MoreHorizontal }

export const PRESET_CATEGORIES = Object.keys(CATEGORIES)

export function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORIES[category] ?? FALLBACK
}

/** Build the category option list from presets + any used in the data. */
export function allCategories(txns: Txn[]): string[] {
  const set = new Set<string>(PRESET_CATEGORIES)
  txns.forEach((t) => set.add(t.category))
  return Array.from(set)
}

/** Distinct past merchants matching a query, most-recent first, capped. */
export function getMerchantSuggestions(query: string, txns: Txn[], limit = 5): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of txns) {
    const name = t.merchant
    const key = name.toLowerCase()
    if (key === q) continue // exact match needs no suggestion
    if (key.includes(q) && !seen.has(key)) {
      seen.add(key)
      out.push(name)
      if (out.length >= limit) break
    }
  }
  return out
}

/** Keyword → category, used to auto-suggest a category from a merchant name. */
const MERCHANT_CATEGORY_KEYWORDS: { match: string[]; category: string }[] = [
  { match: ['tesco', 'lidl', 'aldi', 'supervalu', 'spar', 'grocery', 'supermarket', 'market'], category: 'Groceries' },
  { match: ['restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'burger', 'pizza', 'deliveroo', 'bar', 'pub'], category: 'Dining' },
  { match: ['uber', 'taxi', 'bus', 'train', 'rail', 'fuel', 'petrol', 'shell', 'parking', 'transport'], category: 'Transport' },
  { match: ['rent', 'mortgage', 'landlord', 'housing'], category: 'Housing' },
  { match: ['pharmacy', 'doctor', 'clinic', 'hospital', 'dental', 'health'], category: 'Healthcare' },
  { match: ['netflix', 'spotify', 'cinema', 'disney', 'game', 'steam', 'concert'], category: 'Entertainment' },
  { match: ['amazon', 'zara', 'shop', 'store', 'ikea'], category: 'Shopping' },
  { match: ['electric', 'gas', 'water', 'broadband', 'phone', 'mobile', 'utility', 'energy'], category: 'Utilities' },
  { match: ['salary', 'payroll', 'wage', 'refund', 'invoice', 'freelance', 'dividend'], category: 'Income' },
]

/** Suggest a category: first match a known past merchant, then keyword rules. */
export function suggestCategory(merchant: string, txns: Txn[]): string {
  const name = merchant.trim().toLowerCase()
  if (!name) return 'Other'
  const prior = txns.find((t) => t.merchant.toLowerCase() === name)
  if (prior) return prior.category
  for (const rule of MERCHANT_CATEGORY_KEYWORDS) {
    if (rule.match.some((kw) => name.includes(kw))) return rule.category
  }
  return 'Other'
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ── Date helpers ────────────────────────────────────────────────────────────

function safeDate(value: string): Date {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? new Date(0) : d
}

/** "Today" / "Yesterday" / "Mon 12 Jun" */
export function dateHeaderLabel(value: string): string {
  const d = safeDate(value)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEE d MMM')
}

/** Compact per-row time: "14:30" today, "Mon" this week, else "12 Jun". */
export function rowTimeLabel(value: string): string {
  const d = safeDate(value)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, 'EEE')
  return format(d, 'd MMM')
}

// ── Filtering / sorting / grouping ───────────────────────────────────────────

export type SortKey =
  | 'date-newest' | 'date-oldest' | 'amount-high' | 'amount-low' | 'merchant-az'

export type DatePreset = 'this-month' | 'last-month' | 'last-3-months' | 'all-time'

export interface Filters {
  search: string
  category: string // 'all' or a category name
  type: 'all' | TxnType
  datePreset: DatePreset
  sort: SortKey
}

export const DEFAULT_FILTERS: Filters = {
  search: '',
  category: 'all',
  type: 'all',
  datePreset: 'all-time',
  sort: 'date-newest',
}

export function filtersAreActive(f: Filters): boolean {
  return (
    f.search.trim() !== '' ||
    f.category !== 'all' ||
    f.type !== 'all' ||
    f.datePreset !== 'all-time'
  )
}

function inDatePreset(value: string, preset: DatePreset, now: Date): boolean {
  if (preset === 'all-time') return true
  const d = safeDate(value)
  if (preset === 'this-month') {
    return isWithinInterval(d, { start: startOfMonth(now), end: endOfMonth(now) })
  }
  if (preset === 'last-month') {
    const ref = subMonths(now, 1)
    return isWithinInterval(d, { start: startOfMonth(ref), end: endOfMonth(ref) })
  }
  // last-3-months
  return isWithinInterval(d, { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) })
}

export function applyFilters(txns: Txn[], f: Filters, now: Date): Txn[] {
  const q = f.search.trim().toLowerCase()
  return txns.filter((t) => {
    if (f.type !== 'all' && t.type !== f.type) return false
    if (f.category !== 'all' && t.category !== f.category) return false
    if (!inDatePreset(t.date, f.datePreset, now)) return false
    if (q) {
      const hay = `${t.merchant} ${t.category} ${t.notes ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

function sortTxns(txns: Txn[], sort: SortKey): Txn[] {
  const arr = [...txns]
  switch (sort) {
    case 'date-oldest':
      return arr.sort((a, b) => safeDate(a.date).getTime() - safeDate(b.date).getTime())
    case 'amount-high':
      return arr.sort((a, b) => b.amount - a.amount)
    case 'amount-low':
      return arr.sort((a, b) => a.amount - b.amount)
    case 'merchant-az':
      return arr.sort((a, b) => a.merchant.localeCompare(b.merchant))
    case 'date-newest':
    default:
      return arr.sort((a, b) => safeDate(b.date).getTime() - safeDate(a.date).getTime())
  }
}

export interface TxnGroup {
  key: string
  label: string
  items: Txn[]
}

/** Sort, then group by calendar day. Groups ordered newest-first unless the
 *  sort is date-oldest; non-date sorts order items within each day group. */
export function groupByDate(txns: Txn[], sort: SortKey): TxnGroup[] {
  const sorted = sortTxns(txns, sort)
  const map = new Map<string, Txn[]>()
  for (const t of sorted) {
    const key = format(safeDate(t.date), 'yyyy-MM-dd')
    const bucket = map.get(key)
    if (bucket) bucket.push(t)
    else map.set(key, [t])
  }
  const groups: TxnGroup[] = Array.from(map.entries()).map(([key, items]) => ({
    key,
    label: dateHeaderLabel(items[0].date),
    items,
  }))
  // Order groups by day (newest first), respecting an oldest-first date sort.
  groups.sort((a, b) =>
    sort === 'date-oldest' ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key)
  )
  return groups
}
