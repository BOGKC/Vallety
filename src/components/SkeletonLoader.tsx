import { cn } from '../shared/lib/cn'

interface SkeletonBlockProps {
  width?: number | string
  height?: number | string
  borderRadius?: number | string
  className?: string
}

/**
 * Animated shimmer placeholder. The shimmer keyframe (`.skeleton`) lives in
 * index.css and runs background-position across an --bg-elevated → lighter →
 * --bg-elevated gradient on a 1.5s loop.
 */
export function SkeletonBlock({
  width = '100%',
  height = 16,
  borderRadius = 6,
  className,
}: SkeletonBlockProps) {
  return (
    <div
      className={cn('skeleton', className)}
      style={{ width, height, borderRadius }}
      aria-hidden
    />
  )
}

// ── Pre-built compositions ────────────────────────────────────────────────────

/** Mirrors a transaction row: icon circle + two text lines + right-aligned amount. */
export function SkeletonTransactionRow() {
  return (
    <div className="flex items-center gap-3 px-1 py-2" aria-hidden>
      <SkeletonBlock width={36} height={36} borderRadius="9999px" />
      <div className="flex flex-col gap-1.5">
        <SkeletonBlock width={140} height={13} />
        <SkeletonBlock width={80} height={11} />
      </div>
      <div className="ml-auto">
        <SkeletonBlock width={60} height={15} />
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
      <SkeletonBlock width={80} height={11} />
      <SkeletonBlock width={120} height={22} />
      <SkeletonBlock width={60} height={18} borderRadius="9999px" />
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
        <SkeletonBlock width={110} height={14} />
        <SkeletonBlock width={50} height={14} />
      </div>
      <SkeletonBlock width="100%" height={8} borderRadius="9999px" />
      <div className="flex items-center justify-between">
        <SkeletonBlock width={70} height={11} />
        <SkeletonBlock width={40} height={11} />
      </div>
    </div>
  )
}

/** Full-width chart placeholder. */
export function SkeletonChartArea() {
  return <SkeletonBlock width="100%" height={180} borderRadius={12} />
}
