import { useEffect, useRef, useState } from 'react'
import { formatEuro } from '../../shared/lib/formatters'

/**
 * Micro-loading animations for small inline waits. All animate transform /
 * opacity only, all follow the active mode accent via --color-accent, and the
 * global reduced-motion rule collapses every animation to a static state
 * while the informational content stays intact.
 */

/** Three dots pulsing in sequence — an inline "working" indicator. */
export function PulseDots({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ''}`} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="pulse-dot h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: 'var(--color-accent)', animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}

/** A refined accent arc — the default spinner (rounded cap, gradient). */
export function CircleSpinner({ size = 20, className }: { size?: number; className?: string }) {
  const r = 8
  const circ = 2 * Math.PI * r
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      className={`circle-spinner ${className ?? ''}`}
      role="status"
      aria-label="Loading"
    >
      <circle cx="10" cy="10" r={r} fill="none" stroke="var(--color-accent-muted)" strokeWidth="2.5" />
      <circle
        cx="10" cy="10" r={r} fill="none"
        stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={`${circ * 0.28} ${circ * 0.72}`}
      />
    </svg>
  )
}

/** A small accent coin flipping — money-related waits. */
export function CoinFlip({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span
      className={`coin-flip inline-flex items-center justify-center rounded-full font-semibold text-white ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.55,
        backgroundImage: 'linear-gradient(135deg, var(--accent-500), var(--accent-600))',
      }}
      role="status"
      aria-label="Loading"
    >
      €
    </span>
  )
}

/** Thin indeterminate bar — top-of-page / in-flow loading. */
export function BarLoader({ className }: { className?: string }) {
  return (
    <div
      className={`progress-indeterminate ${className ?? ''}`}
      role="progressbar"
      aria-label="Loading"
    />
  )
}

/**
 * Slot-machine number reveal: cycles pseudo-random values that converge on
 * the real total, then settles. Under reduced motion it renders the final
 * value immediately.
 */
export function CountingNumber({
  value,
  duration = 700,
  format = (n: number) => formatEuro(n),
  className,
}: {
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
}) {
  const [display, setDisplay] = useState<number>(value)
  const settled = useRef(false)

  useEffect(() => {
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    settled.current = false
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = reduced ? 1 : Math.min(1, (now - start) / duration)
      if (t >= 1) {
        settled.current = true
        setDisplay(value)
        return
      }
      // Scramble amplitude shrinks as t → 1 (slot machine settling)
      const wobble = (1 - t) * (1 - t) * Math.abs(value || 100)
      // Deterministic-ish jitter from the frame time — no Math.random in render
      const jitter = Math.sin(now / 23) * wobble
      setDisplay(value - wobble / 2 + jitter)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {format(display)}
    </span>
  )
}
