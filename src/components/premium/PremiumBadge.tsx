import { tierDef, type Tier } from '../../shared/lib/plans'

/** Small accent-gradient pill marking a premium feature. */
export function PremiumBadge({ tier, label }: { tier?: Tier; label?: string }) {
  const text = label ?? (tier ? tierDef(tier).name.toUpperCase() : 'PRO')
  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
      style={{ backgroundImage: 'linear-gradient(135deg, var(--accent-500), var(--accent-600))', letterSpacing: '0.04em' }}
    >
      {text}
    </span>
  )
}
