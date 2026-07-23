// ── Billing service (payment-provider boundary) ────────────────────────────────
// EVERYTHING payment-related lives here. Gating and UI never call Stripe
// directly — they call these functions. Wiring real Stripe later is a single
// isolated swap at the TODO markers below; no gating/UI code changes.

import { supabase } from '../../supabase/client'
import { readProfile, saveProfilePatch } from './profile'
import type { Tier, PlanStatus, BillingPeriod } from './plans'
import { billedTotal, tierDef } from './plans'

// The generated Supabase types don't yet include the plan columns or the
// premium_waitlist table (added by docs/migrations/003_plan.sql). Until that
// migration + a types regen, address them through an untyped view. These
// writes are best-effort and never block the local-first state.
type UntypedTable = {
  update: (v: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> }
  insert: (v: Record<string, unknown>) => Promise<unknown>
}
const db = supabase as unknown as { from: (table: string) => UntypedTable }

export const WAITLIST_KEY = 'vallety_premium_waitlist'
export const PLAN_CHANGED_EVENT = 'vallety:plan-changed'
const TRIAL_DAYS = 14

/** Notify in-tab listeners (usePlan) that plan state changed. */
function notifyPlanChange(): void {
  try { window.dispatchEvent(new Event(PLAN_CHANGED_EVENT)) } catch { /* ignore */ }
}

/**
 * Dev/testing flag: when set, upgradeToPlan sets the plan locally so the full
 * premium experience can be exercised without a real payment processor. In
 * production this stays false and upgrades only join the waitlist until Stripe
 * is wired. Toggle in the browser console: localStorage.vallety_dev_billing='1'
 */
function devBillingEnabled(): boolean {
  // Hard off in production builds — the local dev bypass must never let a real
  // user self-activate a paid tier, even by setting the flag by hand.
  if (!import.meta.env.DEV) return false
  try { return window.localStorage.getItem('vallety_dev_billing') === '1' } catch { return false }
}

export interface PlanState {
  plan: Tier
  planStatus: PlanStatus
  planRenewsAt: string | null
  trialEndsAt: string | null
}

/** Read the canonical plan state from the (local-first) profile. */
export function readPlanState(): PlanState {
  const p = readProfile()
  return {
    plan: p.plan ?? 'free',
    planStatus: p.plan_status ?? 'active',
    planRenewsAt: p.plan_renews_at ?? null,
    trialEndsAt: p.trial_ends_at ?? null,
  }
}

/** Persist plan state locally, then best-effort mirror to Supabase. */
async function writePlanState(patch: Partial<PlanState>): Promise<void> {
  saveProfilePatch({
    ...(patch.plan !== undefined && { plan: patch.plan }),
    ...(patch.planStatus !== undefined && { plan_status: patch.planStatus }),
    ...(patch.planRenewsAt !== undefined && { plan_renews_at: patch.planRenewsAt }),
    ...(patch.trialEndsAt !== undefined && { trial_ends_at: patch.trialEndsAt }),
  })
  // Best-effort server mirror. Requires the profiles columns from the migration
  // in docs/migrations/003_plan.sql. Failure never blocks the local update.
  //
  // NOTE: as of docs/migrations/010_billing_and_storage_hardening.sql the DB
  // ignores plan/plan_status/plan_renews_at/trial_ends_at written by the client
  // (a trigger reverts them) — only the service_role key (a future Stripe
  // webhook) may set them. This UPDATE therefore no-ops those columns
  // server-side by design; it is kept so the day billing moves server-side the
  // read path can trust profiles as the source of truth. Client gating today is
  // a UX convenience only, never a security boundary.
  try {
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      await db.from('profiles').update({
        plan: patch.plan,
        plan_status: patch.planStatus,
        plan_renews_at: patch.planRenewsAt,
        trial_ends_at: patch.trialEndsAt,
      }).eq('id', data.user.id)
    }
  } catch {
    /* offline / column missing — local state is authoritative until sync */
  }
  notifyPlanChange()
}

// ── Waitlist ────────────────────────────────────────────────────────────────────

export interface WaitlistEntry { email: string; tier: Tier; period: BillingPeriod; at: string }

/** Capture interest while payments aren't live. Stored locally + to Supabase. */
export async function joinWaitlist(email: string, tier: Tier, period: BillingPeriod): Promise<void> {
  const entry: WaitlistEntry = { email: email.trim(), tier, period, at: new Date().toISOString() }
  try {
    const raw = window.localStorage.getItem(WAITLIST_KEY)
    const list: WaitlistEntry[] = raw ? JSON.parse(raw) : []
    window.localStorage.setItem(WAITLIST_KEY, JSON.stringify([...list, entry]))
  } catch { /* ignore */ }
  // Best-effort: requires a `premium_waitlist` table (see migration doc).
  try {
    await db.from('premium_waitlist').insert({ email: entry.email, tier, period })
  } catch { /* table may not exist yet — local capture still recorded */ }
}

// ── The purchase action (Stripe integration point) ─────────────────────────────

export type UpgradeResult =
  | { kind: 'activated'; tier: Tier }        // dev flag: plan set locally
  | { kind: 'waitlisted' }                   // production placeholder
  | { kind: 'error'; message: string }

/**
 * The single entry point every "Upgrade" button funnels through. Today it
 * either activates the plan locally (dev flag, for testing the premium UX) or
 * records a waitlist entry. Swapping in Stripe is a one-line change here.
 */
export async function upgradeToPlan(
  tier: Tier,
  period: BillingPeriod,
  email?: string,
): Promise<UpgradeResult> {
  try {
    // ════════════════════════════════════════════════════════════════════════
    // TODO: Replace with Stripe Checkout session.
    //   const res = await fetch('/api/create-checkout-session', {
    //     method: 'POST',
    //     body: JSON.stringify({ tier, period, priceId: STRIPE_PRICE_IDS[tier][period] }),
    //   })
    //   const { url } = await res.json()
    //   window.location.href = url   // redirect to Stripe-hosted checkout
    // On return, a Stripe webhook flips profiles.plan / plan_status; the app
    // reads it via readPlanState(). Everything below is the interim placeholder.
    // ════════════════════════════════════════════════════════════════════════

    if (devBillingEnabled()) {
      const renews = new Date()
      renews.setMonth(renews.getMonth() + (period === 'annual' ? 12 : 1))
      await writePlanState({
        plan: tier,
        planStatus: 'active',
        planRenewsAt: renews.toISOString(),
        trialEndsAt: null,
      })
      return { kind: 'activated', tier }
    }

    if (email) await joinWaitlist(email, tier, period)
    return { kind: 'waitlisted' }
  } catch (e) {
    return { kind: 'error', message: e instanceof Error ? e.message : 'Something went wrong.' }
  }
}

/** Start a 14-day trial of a paid tier — full premium UX, no payment. */
export async function startTrial(tier: Tier): Promise<void> {
  const ends = new Date()
  ends.setDate(ends.getDate() + TRIAL_DAYS)
  await writePlanState({
    plan: tier,
    planStatus: 'trialing',
    trialEndsAt: ends.toISOString(),
    planRenewsAt: null,
  })
}

/**
 * Cancel — placeholder. Marks the plan cancelled; real Stripe cancellation
 * happens at the TODO below. Access continues until planRenewsAt (grace).
 */
export async function cancelPlan(): Promise<void> {
  // TODO: Replace with Stripe subscription cancel (at period end).
  //   await fetch('/api/cancel-subscription', { method: 'POST' })
  await writePlanState({ planStatus: 'cancelled' })
}

/** Days left in the current trial (0 if not trialing / expired). */
export function daysLeftInTrial(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0
  const ms = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

/** Human summary for order/summary UIs, e.g. "€19.99 / month" or "€199.90 / year". */
export function priceSummary(tier: Tier, period: BillingPeriod): string {
  const total = billedTotal(tier, period)
  if (tierDef(tier).monthly === 0) return 'Free'
  return period === 'annual'
    ? `€${total.toFixed(2)} / year`
    : `€${total.toFixed(2)} / month`
}
