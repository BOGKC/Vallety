import { useCountUp } from '../shared/hooks/useCountUp'
import { formatEuro } from '../shared/lib/formatters'

/**
 * Euro value that counts up (cubic ease-out) from 0 on mount and from its
 * previous value on change. Reduced-motion and near-zero deltas snap.
 */
export function AnimatedEuro({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const animated = useCountUp(value)
  return <>{formatEuro(animated, decimals)}</>
}

/** Percentage that counts up the same way. */
export function AnimatedPercent({ value }: { value: number }) {
  const animated = useCountUp(value)
  return <>{Math.round(animated)}%</>
}
