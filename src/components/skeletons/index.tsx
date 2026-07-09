import { cn } from '../../shared/lib/cn'

/**
 * Skeleton loaders that mirror the shape of real content, so layout never
 * jumps when data arrives. The shimmer (`.skeleton` in index.css) sweeps a
 * light band left→right over the elevation colors (bg-2 → bg-3) on a smooth
 * 1.8s loop — part of the design, not a gray placeholder.
 *
 * Pair with useMinLoading(150) so fast (synchronous localStorage) loads don't
 * flash the skeleton in and out.
 */

interface SkeletonProps {
  width?: number | string
  height?: number | string
  borderRadius?: number | string
  className?: string
}

/** Base shimmer block. */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 6,
  className,
}: SkeletonProps) {
  return (
    <div
      className={cn('skeleton', className)}
      style={{ width, height, borderRadius }}
      aria-hidden
    />
  )
}

/** Back-compat alias (older call sites import SkeletonBlock). */
export { Skeleton as SkeletonBlock }

/**
 * Renders `count` copies of a row skeleton. Pass the cached item count where
 * one exists so the placeholder matches reality; defaults to 5 rows.
 */
export function SkeletonList({
  count = 5,
  children,
}: {
  count?: number
  children: React.ReactNode
}) {
  return (
    <div aria-hidden aria-busy="true">
      {Array.from({ length: Math.max(1, Math.min(count, 12)) }, (_, i) => (
        <div key={i}>{children}</div>
      ))}
    </div>
  )
}

// ── Pre-built compositions ────────────────────────────────────────────────────

/** Mirrors a transaction row: icon circle + two text lines + right-aligned amount. */
export function SkeletonTransactionRow() {
  return (
    <div className="flex items-center gap-3 px-1 py-2" aria-hidden>
      <Skeleton width={36} height={36} borderRadius="9999px" />
      <div className="flex flex-col gap-1.5">
        <Skeleton width={140} height={13} />
        <Skeleton width={80} height={11} />
      </div>
      <div className="ml-auto">
        <Skeleton width={60} height={15} />
      </div>
    </div>
  )
}

/** Mirrors a dashboard metric card: label + larger value + delta pill. */
export function SkeletonMetricCard() {
  return (
    <div
      className="flex flex-col gap-2.5 rounded-lg border p-4"
      style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}
      aria-hidden
    >
      <Skeleton width={80} height={11} />
      <Skeleton width={120} height={22} />
      <Skeleton width={60} height={18} borderRadius="9999px" />
    </div>
  )
}

/** Mirrors a budget card: header row + progress bar + footer row. */
export function SkeletonBudgetCard() {
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border p-4"
      style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}
      aria-hidden
    >
      <div className="flex items-center justify-between">
        <Skeleton width={110} height={14} />
        <Skeleton width={50} height={14} />
      </div>
      <Skeleton width="100%" height={8} borderRadius="9999px" />
      <div className="flex items-center justify-between">
        <Skeleton width={70} height={11} />
        <Skeleton width={40} height={11} />
      </div>
    </div>
  )
}

/** Full-width chart placeholder. */
export function SkeletonChart({ height = 180 }: { height?: number }) {
  return <Skeleton width="100%" height={height} borderRadius={12} />
}

/** Back-compat alias for the previous name. */
export { SkeletonChart as SkeletonChartArea }

/** Mirrors a goal card: progress ring + title + amounts. */
export function SkeletonGoalRing() {
  return (
    <div
      className="flex items-center gap-4 rounded-lg border p-4"
      style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}
      aria-hidden
    >
      <Skeleton width={56} height={56} borderRadius="9999px" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton width={120} height={14} />
        <Skeleton width={90} height={11} />
      </div>
      <Skeleton width={60} height={18} />
    </div>
  )
}

/** Mirrors an invoice row: number + client + status pill + amount. */
export function SkeletonInvoiceRow() {
  return (
    <div className="flex items-center gap-3 px-1 py-2.5" aria-hidden>
      <Skeleton width={64} height={13} />
      <div className="flex flex-col gap-1.5">
        <Skeleton width={120} height={13} />
        <Skeleton width={70} height={11} />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Skeleton width={54} height={20} borderRadius="9999px" />
        <Skeleton width={64} height={15} />
      </div>
    </div>
  )
}
