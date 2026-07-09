import { RefreshCw } from 'lucide-react'

/**
 * Section-level load failure — inline within the affected area, never a
 * full-page takeover; the rest of the app stays usable. Use this (not an
 * empty state) whenever data failed to load: "add your first transaction"
 * must never appear when the truth is that the fetch failed.
 */
export function InlineError({
  what = 'this section',
  onRetry,
  className,
}: {
  /** Human name of the data that failed, e.g. "transactions", "budgets". */
  what?: string
  onRetry: () => void
  className?: string
}) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-lg border p-6 text-center sm:flex-row sm:justify-between sm:text-left ${className ?? ''}`}
      style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}
      role="alert"
    >
      <p className="text-[14px] text-text-secondary">
        Couldn't load your {what} right now.
      </p>
      <button
        onClick={onRetry}
        className="inline-flex h-9 flex-shrink-0 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium hover:bg-bg-elevated"
        style={{
          borderColor: 'var(--border-default)',
          color: 'var(--text-primary)',
          transition: 'var(--transition-fast)',
        }}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  )
}
