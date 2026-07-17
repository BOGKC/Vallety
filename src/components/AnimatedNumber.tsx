import { useCountUp } from '../shared/hooks/useCountUp'
import { formatEuro, formatCurrency } from '../shared/lib/formatters'

/**
 * Euro value that counts up (cubic ease-out) from 0 on mount and from its
 * previous value on change. Reduced-motion and near-zero deltas snap.
 */
export function AnimatedEuro({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const animated = useCountUp(value)
  return <>{formatEuro(animated, decimals)}</>
}

/** Same count-up animation, formatted in an arbitrary currency. */
export function AnimatedMoney({
  value, currency, decimals = 0,
}: { value: number; currency: string; decimals?: number }) {
  const animated = useCountUp(value)
  return <>{formatCurrency(animated, currency, { decimals })}</>
}

/** Percentage that counts up the same way. */
export function AnimatedPercent({ value }: { value: number }) {
  const animated = useCountUp(value)
  return <>{Math.round(animated)}%</>
}
