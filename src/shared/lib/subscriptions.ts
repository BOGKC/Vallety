import { normalizeMerchant } from './detectSubscriptions'

export type SubStatus = 'active' | 'to_cancel' | 'hidden'
export type SubFrequency = 'monthly' | 'yearly'

// ── Manual subscriptions ──────────────────────────────────────────────────────

export const SUBS_KEY = 'vallety_subscriptions'

export interface ManualSub {
  id: string
  merchant: string
  amount: number
  frequency: SubFrequency
  lastCharged: string // ISO
  status: SubStatus
  reminderDate?: string
  createdAt: string
}

function normalizeManual(raw: unknown): ManualSub | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const amount = Number(r.amount)
  if (!Number.isFinite(amount)) return null
  const status = (['active', 'to_cancel', 'hidden'] as const).includes(r.status as SubStatus)
    ? (r.status as SubStatus)
    : 'active'
  return {
    id: String(r.id ?? `sub_${Date.now()}`),
    merchant: String(r.merchant ?? 'Subscription'),
    amount: Math.abs(amount),
    frequency: r.frequency === 'yearly' ? 'yearly' : 'monthly',
    lastCharged: String(r.lastCharged ?? new Date().toISOString()),
    status,
    reminderDate: r.reminderDate ? String(r.reminderDate) : undefined,
    createdAt: String(r.createdAt ?? new Date().toISOString()),
  }
}

export function readManualSubs(): ManualSub[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(SUBS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeManual).filter((s): s is ManualSub => s !== null)
  } catch {
    return []
  }
}

export function writeManualSubs(subs: ManualSub[]): void {
  try {
    window.localStorage.setItem(SUBS_KEY, JSON.stringify(subs))
  } catch {
    /* ignore */
  }
}

export function addManualSub(input: Omit<ManualSub, 'id' | 'createdAt'>): ManualSub[] {
  const sub: ManualSub = {
    ...input,
    amount: Math.abs(input.amount),
    id: `sub_${Date.now()}_${Math.floor(performance.now())}`,
    createdAt: new Date().toISOString(),
  }
  const next = [...readManualSubs(), sub]
  writeManualSubs(next)
  return next
}

export function updateManualSub(id: string, patch: Partial<ManualSub>): ManualSub[] {
  const next = readManualSubs().map((s) => (s.id === id ? { ...s, ...patch } : s))
  writeManualSubs(next)
  return next
}

export function deleteManualSub(id: string): ManualSub[] {
  const next = readManualSubs().filter((s) => s.id !== id)
  writeManualSubs(next)
  return next
}

export function monthlyEquivalent(amount: number, frequency: SubFrequency): number {
  return frequency === 'yearly' ? amount / 12 : amount
}

// ── Overrides for auto-detected subscriptions ─────────────────────────────────
// Detected subs are recomputed from transactions each load; their user state
// (status / reminder / dismissal) is persisted separately, keyed by merchant.

export const SUB_OVERRIDES_KEY = 'vallety_sub_overrides'

export interface SubOverride {
  status?: SubStatus
  reminderDate?: string
  dismissed?: boolean
}

export type OverrideMap = Record<string, SubOverride>

export function readOverrides(): OverrideMap {
  if (typeof window === 'undefined' || !window.localStorage) return {}
  try {
    const raw = window.localStorage.getItem(SUB_OVERRIDES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as OverrideMap) : {}
  } catch {
    return {}
  }
}

export function writeOverrides(map: OverrideMap): void {
  try {
    window.localStorage.setItem(SUB_OVERRIDES_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function setOverride(merchantKey: string, patch: SubOverride): OverrideMap {
  const map = readOverrides()
  map[merchantKey] = { ...map[merchantKey], ...patch }
  writeOverrides(map)
  return map
}

// ── Pastel colour from merchant name ──────────────────────────────────────────

export function merchantColor(name: string): string {
  const key = normalizeMerchant(name)
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  const hue = hash % 360
  return `hsl(${hue}, 45%, 55%)`
}

export function merchantInitial(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed[0].toUpperCase() : '?'
}
