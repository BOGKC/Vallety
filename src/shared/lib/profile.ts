// ── Profile & settings data layer ─────────────────────────────────────────────
// Single source of truth for the /profile page. Everything persists under
// "vallety_profile"; patches are always spread-merged into the stored object so
// individual field saves can never clobber the rest.

export const PROFILE_KEY = 'vallety_profile'
export const PROFILE_PHOTO_KEY = 'vallety_profile_photo'
export const PLAN_KEY = 'vallety_plan'
export const CREATED_AT_KEY = 'vallety_created_at'
export const LAST_UPDATED_KEY = 'vallety_last_updated'
export const NEXT_BILLING_KEY = 'vallety_next_billing'

export type Plan = 'Free' | 'Personal' | 'Freelancer' | 'Business' | 'Investor' | 'All Access'

export interface NotificationPrefs {
  bill_reminders: boolean
  bill_reminder_timing: '3d' | '1d' | 'both'
  budget_warnings: boolean
  budget_threshold: 70 | 80 | 90
  goal_milestones: boolean
  overdue_invoices: boolean
  subscription_price_changes: boolean
  monthly_summary: boolean
  unusual_spending: boolean
}

export interface LoyaltyCard {
  number: string
  points?: number
}

export interface LoyaltyCards {
  kplussa?: LoyaltyCard
  setukortti?: LoyaltyCard
  lidl?: LoyaltyCard
  finnair?: LoyaltyCard
}

export interface ValletyProfile {
  // Personal
  full_name: string
  email: string
  phone: string
  avatar_url: string | null // public URL from the Supabase 'avatars' bucket
  created_at: string // ISO
  // Plan / billing (canonical plan state — see plans.ts / billing.ts)
  plan: import('./plans').Tier
  plan_status: import('./plans').PlanStatus
  plan_renews_at: string | null
  trial_ends_at: string | null
  // First-run guidance (persisted so nothing ever re-shows once done/skipped)
  onboarded: boolean
  getting_started_done: boolean
  tour_done: boolean
  // App preferences
  home_currency: string
  language: 'en' | 'fi' | 'sv'
  date_format: 'DD.MM.YYYY' | 'MM/DD/YYYY'
  number_format: 'eu' | 'us'
  theme: 'dark' | 'light' | 'system'
  week_start: 'monday' | 'sunday'
  // Financial
  monthly_income: string
  primary_bank: string
  municipality: string
  financial_year_start: number // 1–12 (1 = January)
  // Business
  business_enabled: boolean
  business_name: string
  y_tunnus: string
  business_type: '' | 'toiminimi' | 'oy' | 'freelancer' | 'kevytyrittaja'
  vat_registered: boolean
  vat_frequency: 'monthly' | 'quarterly' | 'annual'
  yel_income: string
  age_bracket: 'under53' | '53-62' | 'over62'
  // Simplified tax-estimate rate overrides (percent strings; '' = use the
  // TAX_RATES defaults in src/lib/taxEstimate.ts).
  est_income_tax_rate: string
  est_alv_rate: string
  est_yel_rate: string
  invoice_currency: string
  payment_terms: '14' | '30' | 'custom'
  payment_terms_custom: string
  iban: string
  bic: string
  business_address: string
  // Notifications
  notifications: NotificationPrefs
  // Integrations
  loyalty: LoyaltyCards
}

export const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  bill_reminders: true,
  bill_reminder_timing: '3d',
  budget_warnings: true,
  budget_threshold: 80,
  goal_milestones: true,
  overdue_invoices: true,
  subscription_price_changes: true,
  monthly_summary: true,
  unusual_spending: false,
}

export const DEFAULT_PROFILE: ValletyProfile = {
  full_name: '',
  email: '',
  phone: '',
  avatar_url: null,
  created_at: '',
  plan: 'free',
  plan_status: 'active',
  plan_renews_at: null,
  trial_ends_at: null,
  onboarded: false,
  getting_started_done: false,
  tour_done: false,
  home_currency: 'EUR',
  language: 'en',
  date_format: 'DD.MM.YYYY',
  number_format: 'eu',
  theme: 'dark',
  week_start: 'monday',
  monthly_income: '',
  primary_bank: '',
  municipality: '',
  financial_year_start: 1,
  business_enabled: false,
  business_name: '',
  y_tunnus: '',
  business_type: '',
  vat_registered: false,
  vat_frequency: 'quarterly',
  yel_income: '',
  age_bracket: 'under53',
  est_income_tax_rate: '',
  est_alv_rate: '',
  est_yel_rate: '',
  invoice_currency: 'EUR',
  payment_terms: '30',
  payment_terms_custom: '',
  iban: '',
  bic: '',
  business_address: '',
  notifications: DEFAULT_NOTIFICATIONS,
  loyalty: {},
}

export function readProfile(): ValletyProfile {
  let stored: Partial<ValletyProfile> = {}
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') stored = parsed as Partial<ValletyProfile>
    }
  } catch {
    /* fall through to defaults */
  }
  // created_at defaults to the moment the profile is first seen.
  let createdAt = stored.created_at
  if (!createdAt) {
    try {
      createdAt = window.localStorage.getItem(CREATED_AT_KEY) ?? ''
    } catch {
      createdAt = ''
    }
    if (!createdAt) {
      createdAt = new Date().toISOString()
      try {
        window.localStorage.setItem(CREATED_AT_KEY, createdAt)
      } catch {
        /* ignore */
      }
    }
  }
  return {
    ...DEFAULT_PROFILE,
    ...stored,
    created_at: createdAt,
    notifications: { ...DEFAULT_NOTIFICATIONS, ...(stored.notifications ?? {}) },
    loyalty: { ...(stored.loyalty ?? {}) },
  }
}

/** Spread-merge a patch into the stored profile (never overwrites the rest). */
// Profile free-text fields (business_name, iban, address, phone…) have no
// dedicated form schema, so bound every string here as a defence-in-depth cap
// against storage-bloat / oversized writes. It is not a security boundary on its
// own (output is React-escaped and rows are RLS-scoped to the owner), just a
// sane ceiling applied at the single write choke point.
const MAX_PROFILE_STR = 256

function clampProfileStrings(patch: Partial<ValletyProfile>): Partial<ValletyProfile> {
  const out: Record<string, unknown> = { ...patch }
  for (const [k, v] of Object.entries(out)) {
    if (typeof v === 'string' && v.length > MAX_PROFILE_STR) out[k] = v.slice(0, MAX_PROFILE_STR)
  }
  return out as Partial<ValletyProfile>
}

export function saveProfilePatch(patch: Partial<ValletyProfile>): void {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY)
    const stored = raw ? JSON.parse(raw) : {}
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...stored, ...clampProfileStrings(patch) }))
    window.localStorage.setItem(LAST_UPDATED_KEY, new Date().toISOString())
  } catch {
    /* storage full or unavailable — the in-memory state still works */
  }
}

export function readPlan(): Plan {
  try {
    const p = window.localStorage.getItem(PLAN_KEY)
    if (p && ['Free', 'Personal', 'Freelancer', 'Business', 'Investor', 'All Access'].includes(p)) {
      return p as Plan
    }
  } catch {
    /* ignore */
  }
  return 'Free'
}

/** Total size of all vallety_* localStorage entries, in kilobytes. */
export function storageUsedKb(): number {
  let chars = 0
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key || !key.startsWith('vallety_')) continue
      chars += key.length + (window.localStorage.getItem(key)?.length ?? 0)
    }
  } catch {
    return 0
  }
  return (chars * 2) / 1024 // UTF-16: 2 bytes per char
}

/** All vallety_* keys and parsed values — used by the GDPR JSON export. */
export function collectAllData(): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key || !key.startsWith('vallety_')) continue
      const raw = window.localStorage.getItem(key) ?? ''
      try {
        out[key] = JSON.parse(raw)
      } catch {
        out[key] = raw
      }
    }
  } catch {
    /* ignore */
  }
  return out
}

export function clearAllValletyKeys(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key && key.startsWith('vallety_')) keys.push(key)
    }
    keys.forEach((k) => window.localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}

// Which user the local-first data on this device belongs to.
const DATA_OWNER_KEY = 'vallety_data_owner'

/**
 * Shared-device guard. All financial data lives under global localStorage keys,
 * so if user A leaves the browser without an explicit sign-out (closed tab,
 * lapsed session), those keys linger. When ANY user authenticates we compare
 * their id to the stored owner: a mismatch means the local data belongs to a
 * different account, so we wipe it before the app reads it — user B never sees
 * user A's finances. A returning same-user match keeps their data intact.
 * Must run during auth bootstrap, before any page reads local data.
 */
export function ensureLocalDataOwner(userId: string): void {
  try {
    const owner = window.localStorage.getItem(DATA_OWNER_KEY)
    if (owner && owner !== userId) {
      clearAllValletyKeys()
      void purgeDataCaches()
    }
    window.localStorage.setItem(DATA_OWNER_KEY, userId)
  } catch {
    /* storage unavailable — nothing to protect */
  }
}

/**
 * Purge the service-worker cache of Supabase REST/Storage responses. Those are
 * keyed by URL, not by user, so on a shared device a previous account's cached
 * profile/avatar could otherwise be served. Called on sign-out and when a
 * different user signs in. Best-effort and async; safe where Cache API is absent.
 */
export async function purgeDataCaches(): Promise<void> {
  try {
    if (typeof caches === 'undefined') return
    await caches.delete('supabase-data')
  } catch {
    /* Cache API unavailable — nothing to purge */
  }
}
