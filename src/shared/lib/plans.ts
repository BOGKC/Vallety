// ── Plan / tier definitions ───────────────────────────────────────────────────
// Single source of truth for pricing, features and limits. The gating layer
// (usePlan + PremiumGate/UsageLimitGate) reads only from here, so tier tweaks
// never touch call sites.

export type Tier = 'free' | 'personal' | 'freelancer' | 'investor' | 'business' | 'all_access'
export type PlanStatus = 'active' | 'trialing' | 'cancelled' | 'past_due'
export type BillingPeriod = 'monthly' | 'annual'

/** Ascending by price — drives upgrade/downgrade labelling. */
export const TIER_ORDER: Tier[] = ['free', 'personal', 'freelancer', 'investor', 'business', 'all_access']

export const tierRank = (t: Tier): number => TIER_ORDER.indexOf(t)

export interface TierDef {
  key: Tier
  name: string
  /** Monthly price in EUR (incl. VAT). Annual bills 10× (2 months free). */
  monthly: number
  tagline: string
  recommended?: boolean
}

export const TIERS: TierDef[] = [
  { key: 'free', name: 'Free', monthly: 0, tagline: 'The essentials, forever free.' },
  { key: 'personal', name: 'Personal', monthly: 6.99, tagline: 'Your whole money life, unlocked.' },
  { key: 'freelancer', name: 'Freelancer', monthly: 12.99, tagline: 'Personal + light business tools.' },
  { key: 'investor', name: 'Investor', monthly: 14.99, tagline: 'Personal + full portfolio tracking.' },
  { key: 'business', name: 'Business', monthly: 19.99, tagline: 'Everything a solo founder needs.', recommended: true },
  { key: 'all_access', name: 'All Access', monthly: 27.99, tagline: 'Every feature, unlimited AI.' },
]

export const tierDef = (t: Tier): TierDef => TIERS.find((x) => x.key === t) ?? TIERS[0]

/**
 * The identity sub-label shown under a user's name everywhere (sidebar,
 * header, profile). One function so the three never drift: "Free plan",
 * "Personal", "All Access", …
 */
export const planLabel = (t: Tier): string => (t === 'free' ? 'Free plan' : tierDef(t).name)

/** Annual price = 10 months (2 free). Returns the effective per-month figure. */
export function annualPerMonth(monthly: number): number {
  return (monthly * 10) / 12
}
export function priceFor(t: Tier, period: BillingPeriod): number {
  const m = tierDef(t).monthly
  return period === 'annual' ? annualPerMonth(m) : m
}
/** What actually gets billed at checkout for the chosen period. */
export function billedTotal(t: Tier, period: BillingPeriod): number {
  const m = tierDef(t).monthly
  return period === 'annual' ? m * 10 : m
}

// ── Features ───────────────────────────────────────────────────────────────────

export type FeatureKey =
  | 'csv_import' | 'bank_sync' | 'ai_advisor' | 'unlimited_ai'
  | 'business_mode' | 'investment_mode' | 'household' | 'accountant_export'

const PAID: Tier[] = ['personal', 'freelancer', 'investor', 'business', 'all_access']

/** Which tiers include each feature. all_access implicitly has everything. */
export const FEATURE_TIERS: Record<FeatureKey, Tier[]> = {
  csv_import: PAID,
  bank_sync: PAID,
  ai_advisor: ['free', ...PAID], // free gets a metered taste (see LIMITS.aiMessages)
  unlimited_ai: ['freelancer', 'investor', 'business', 'all_access'],
  business_mode: ['freelancer', 'business', 'all_access'],
  investment_mode: ['investor', 'all_access'],
  household: PAID,
  accountant_export: ['business', 'all_access'],
}

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  csv_import: 'CSV import',
  bank_sync: 'Bank sync',
  ai_advisor: 'AI Advisor',
  unlimited_ai: 'Unlimited AI Advisor',
  business_mode: 'Business mode',
  investment_mode: 'Investor mode',
  household: 'Household sharing',
  accountant_export: 'Accountant export',
}

export function hasFeature(tier: Tier, key: FeatureKey): boolean {
  if (tier === 'all_access') return true
  return FEATURE_TIERS[key].includes(tier)
}

/** Lowest-priced tier that unlocks a feature — used to label gates/CTAs. */
export function requiredTierFor(key: FeatureKey): Tier {
  const tiers = FEATURE_TIERS[key].filter((t) => t !== 'free')
  return tiers.sort((a, b) => tierRank(a) - tierRank(b))[0] ?? 'personal'
}

// ── Count limits (per tier) ─────────────────────────────────────────────────────

export interface Limits {
  transactions: number
  budgets: number
  goals: number
  aiMessages: number
  historyMonths: number
}

const UNLIMITED = Infinity

const FREE_LIMITS: Limits = { transactions: 50, budgets: 2, goals: 2, aiMessages: 5, historyMonths: 3 }
const PERSONAL_LIMITS: Limits = { transactions: UNLIMITED, budgets: UNLIMITED, goals: UNLIMITED, aiMessages: 20, historyMonths: UNLIMITED }
const UNLIMITED_LIMITS: Limits = { transactions: UNLIMITED, budgets: UNLIMITED, goals: UNLIMITED, aiMessages: UNLIMITED, historyMonths: UNLIMITED }

export function limitsFor(tier: Tier): Limits {
  if (tier === 'free') return FREE_LIMITS
  if (tier === 'personal') return PERSONAL_LIMITS
  return UNLIMITED_LIMITS // freelancer / investor / business / all_access
}

/** Rows for the full comparison table on the pricing page. */
export const COMPARISON_ROWS: { label: string; check: (t: Tier) => boolean | string }[] = [
  { label: 'Transactions', check: (t) => (limitsFor(t).transactions === UNLIMITED ? 'Unlimited' : `${limitsFor(t).transactions}`) },
  { label: 'Budgets & goals', check: (t) => (limitsFor(t).budgets === UNLIMITED ? 'Unlimited' : `${limitsFor(t).budgets} each`) },
  { label: 'History', check: (t) => (limitsFor(t).historyMonths === UNLIMITED ? 'Full' : `${limitsFor(t).historyMonths} months`) },
  { label: 'CSV import', check: (t) => hasFeature(t, 'csv_import') },
  { label: 'Bank sync', check: (t) => hasFeature(t, 'bank_sync') },
  { label: 'AI Advisor', check: (t) => (hasFeature(t, 'unlimited_ai') ? 'Unlimited' : `${limitsFor(t).aiMessages}/mo`) },
  { label: 'Household sharing', check: (t) => hasFeature(t, 'household') },
  { label: 'Business mode', check: (t) => hasFeature(t, 'business_mode') },
  { label: 'Investor mode', check: (t) => hasFeature(t, 'investment_mode') },
  { label: 'Accountant export', check: (t) => hasFeature(t, 'accountant_export') },
]
