import { type ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { useUpgrade } from './UpgradeModalProvider'
import type { Tier } from '../../shared/lib/plans'

/**
 * For count-limited free features (50 transactions, 2 budgets…).
 * Under the limit: renders children. At/over the limit: an inline, dismissible
 * upgrade nudge instead of a silent block. Never traps the user.
 */
export function UsageLimitGate({
  used,
  limit,
  noun,
  tier = 'personal',
  children,
}: {
  used: number
  limit: number
  /** Plural noun for the copy, e.g. "transactions", "budgets". */
  noun: string
  tier?: Tier
  children?: ReactNode
}) {
  const { open } = useUpgrade()
  if (!Number.isFinite(limit) || used < limit) return <>{children}</>

  return (
    <div
      className="flex flex-col items-start gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-muted)' }}
      role="status"
    >
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
        <p className="text-[13px] text-text-primary">
          You've reached your free limit of {limit} {noun}.{' '}
          <span className="text-text-secondary">Upgrade for unlimited.</span>
        </p>
      </div>
      <button
        onClick={() => open(tier)}
        className="btn-accent inline-flex h-9 flex-shrink-0 items-center rounded-md px-4 text-[13px] font-semibold text-white"
        style={{ backgroundColor: 'var(--color-accent)' }}
      >
        Upgrade
      </button>
    </div>
  )
}
