import { useEffect, useState } from 'react'
import { PulseDots } from './loaders'

/**
 * Rotating contextual loading messages for operations that take a noticeable
 * moment (CSV import, AI thinking, report generation…). Calm and specific —
 * never generic "Loading…", never jokey about someone's money.
 *
 * Behaviour:
 *  - appears only after `appearAfterMs` (default 800ms) so fast operations
 *    never flash a message;
 *  - rotates through the script every 2s with a soft crossfade, holding on
 *    the last message;
 *  - after 15s switches to a "taking longer than usual" state with an
 *    optional retry action — no spinner ever spins forever;
 *  - announces progress via aria-live="polite".
 */

export type LoadingOperation =
  | 'csvImport'
  | 'bankSync'
  | 'advisor'
  | 'report'
  | 'netWorth'
  | 'generic'

const SCRIPTS: Record<LoadingOperation, string[]> = {
  csvImport: [
    'Reading your bank file…',
    'Sorting {count} transactions…',
    'Matching merchants to categories…',
    'Checking for duplicates…',
    'Almost done…',
  ],
  bankSync: [
    'Connecting to your bank…',
    'Fetching recent transactions…',
    'Organizing everything…',
    'Tidying up…',
  ],
  advisor: [
    'Reading your numbers…',
    'Thinking it through…',
    'Putting it together…',
  ],
  report: [
    'Crunching the numbers…',
    'Drawing the charts…',
    'Finding the highlights…',
  ],
  netWorth: [
    'Adding up your assets…',
    'Subtracting what you owe…',
    'Calculating your net worth…',
  ],
  generic: ['Working on it…', 'Almost there…'],
}

interface Props {
  operation: LoadingOperation
  /** Substituted into "{count}" placeholders (e.g. CSV row count). */
  count?: number
  /** Delay before the messages appear at all. */
  appearAfterMs?: number
  /** Called from the "Retry" button in the long-wait state. */
  onRetry?: () => void
  className?: string
}

export function LoadingMessages({
  operation,
  count,
  appearAfterMs = 800,
  onRetry,
  className,
}: Props) {
  const [visible, setVisible] = useState(appearAfterMs === 0)
  const [index, setIndex] = useState(0)
  const [longWait, setLongWait] = useState(false)

  const script = SCRIPTS[operation]

  useEffect(() => {
    const show = window.setTimeout(() => setVisible(true), appearAfterMs)
    const long = window.setTimeout(() => setLongWait(true), 15000)
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(long)
    }
  }, [appearAfterMs])

  useEffect(() => {
    if (!visible || longWait) return
    const id = window.setInterval(
      () => setIndex((i) => Math.min(i + 1, script.length - 1)),
      2000
    )
    return () => window.clearInterval(id)
  }, [visible, longWait, script.length])

  if (!visible) return null

  if (longWait) {
    return (
      <div
        className={`flex items-center gap-2.5 text-[13px] text-text-secondary ${className ?? ''}`}
        role="status"
        aria-live="polite"
      >
        <span>This is taking longer than usual.</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="font-medium hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  const message = script[index].replace('{count}', count != null ? String(count) : 'your')

  return (
    <div
      className={`flex items-center gap-2.5 text-[13px] text-text-secondary ${className ?? ''}`}
      role="status"
      aria-live="polite"
    >
      <PulseDots />
      {/* key remounts the span per message → crossfade via .loading-msg */}
      <span key={index} className="loading-msg">{message}</span>
    </div>
  )
}
