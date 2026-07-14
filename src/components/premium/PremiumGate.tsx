import { type ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { usePlan } from '../../shared/hooks/usePlan'
import { useUpgrade } from './UpgradeModalProvider'
import {
  hasFeature, requiredTierFor, tierDef, FEATURE_LABELS, type FeatureKey, type Tier,
} from '../../shared/lib/plans'

/**
 * Wraps a premium feature. When the user has access, renders children plainly.
 * When they don't, renders the REAL UI blurred behind frosted glass with a
 * lock badge and an Upgrade button — seeing what's behind the wall is what
 * converts, so we tease rather than hide.
 */
export function PremiumGate({
  featureKey,
  requiredTier,
  children,
  minHeight = 160,
}: {
  featureKey: FeatureKey
  requiredTier?: Tier
  children: ReactNode
  /** Ensures the locked preview has enough height to read behind the glass. */
  minHeight?: number
}) {
  const { plan } = usePlan()
  const { open } = useUpgrade()

  if (hasFeature(plan, featureKey)) return <>{children}</>

  const tier = requiredTier ?? requiredTierFor(featureKey)
  const feature = FEATURE_LABELS[featureKey]

  return (
    <div className="relative overflow-hidden rounded-lg" style={{ minHeight }}>
      {/* Real UI, dimmed + non-interactive */}
      <div className="pointer-events-none select-none blur-[6px] saturate-[0.7] opacity-60" aria-hidden inert>
        {children}
      </div>

      {/* Frosted overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center"
        style={{
          background: 'color-mix(in srgb, var(--bg-primary) 55%, transparent)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
        role="group"
        aria-label={`${feature} — locked`}
      >
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--color-accent-muted)' }}
        >
          <Lock className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
        </span>
        <p className="text-[14px] font-semibold text-text-primary">{feature}</p>
        <p className="max-w-xs text-[13px] text-text-secondary">
          Upgrade to {tierDef(tier).name} to unlock {feature.toLowerCase()}.
        </p>
        <button
          onClick={() => open(tier)}
          className="btn-accent mt-1 inline-flex h-9 items-center rounded-md px-4 text-[13px] font-semibold text-white"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          Upgrade
        </button>
      </div>
    </div>
  )
}
