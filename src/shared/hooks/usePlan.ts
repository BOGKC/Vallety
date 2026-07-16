import { useSyncExternalStore } from 'react'
import { readPlanState, daysLeftInTrial, PLAN_CHANGED_EVENT } from '../lib/billing'
import {
  hasFeature as tierHasFeature, limitsFor, type Tier, type PlanStatus, type FeatureKey,
} from '../lib/plans'

// Single source of truth for gating. Re-reads on the in-tab plan-changed event
// and cross-tab storage events, so upgrades/trials reflect immediately.

function subscribe(cb: () => void): () => void {
  window.addEventListener(PLAN_CHANGED_EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(PLAN_CHANGED_EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

// Snapshot is a primitive string so useSyncExternalStore never loops; the hook
// re-derives the object from it.
function getSnapshot(): string {
  const s = readPlanState()
  return `${s.plan}|${s.planStatus}|${s.trialEndsAt ?? ''}|${s.planRenewsAt ?? ''}`
}

export interface UsePlan {
  plan: Tier
  planStatus: PlanStatus
  isPremium: boolean
  isFree: boolean
  isTrialing: boolean
  daysLeftInTrial: number
  planRenewsAt: string | null
  trialEndsAt: string | null
  hasFeature: (key: FeatureKey) => boolean
  /** Count-limit for the current plan, e.g. limit('budgets'). Infinity = unlimited. */
  limit: (key: keyof ReturnType<typeof limitsFor>) => number
}

export function usePlan(): UsePlan {
  useSyncExternalStore(subscribe, getSnapshot, () => 'free|active||')
  const { plan, planStatus, trialEndsAt, planRenewsAt } = readPlanState()

  // A cancelled subscription keeps premium until the renewal date (grace).
  const graceActive = planStatus === 'cancelled' && planRenewsAt != null && new Date(planRenewsAt) > new Date()
  const entitled = planStatus === 'active' || planStatus === 'trialing' || planStatus === 'past_due' || graceActive
  const effectivePlan: Tier = entitled ? plan : 'free'

  return {
    plan: effectivePlan,
    planStatus,
    isPremium: effectivePlan !== 'free',
    isFree: effectivePlan === 'free',
    isTrialing: planStatus === 'trialing',
    daysLeftInTrial: daysLeftInTrial(trialEndsAt),
    planRenewsAt,
    trialEndsAt,
    hasFeature: (key) => tierHasFeature(effectivePlan, key),
    limit: (key) => limitsFor(effectivePlan)[key],
  }
}
