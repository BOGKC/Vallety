import { useEffect, useRef, useState } from 'react'

interface ProgressBarProps {
  /** 0–100 (clamped). */
  value: number
  color: string
  className?: string
  /** Accessible name for the progressbar (e.g. "Groceries budget"). */
  label?: string
}

/**
 * Progress bar that animates its fill from 0 to `value` the first time it
 * scrolls into view (IntersectionObserver + has-animated flag), then tracks
 * value changes without replaying the intro. The fill carries the
 * `.progress-fill` class (600ms width transition).
 */
export function ProgressBar({ value, color, className, label }: ProgressBarProps) {
  const ref = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)
  const [width, setWidth] = useState('0%')
  const target = Math.min(100, Math.max(0, value))

  useEffect(() => {
    if (hasAnimated.current) {
      setWidth(`${target}%`)
      return
    }
    const el = ref.current
    if (!el) return

    const reveal = () => {
      if (hasAnimated.current) return
      hasAnimated.current = true
      requestAnimationFrame(() => setWidth(`${target}%`))
    }

    if (typeof IntersectionObserver === 'undefined') {
      reveal()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal()
            observer.disconnect()
          }
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    // Safety net: if the bar never intersects (e.g. inside a non-scrolling
    // overflow container), reveal it anyway so it never stays stuck at 0%.
    const fallback = window.setTimeout(() => {
      reveal()
      observer.disconnect()
    }, 1200)
    return () => {
      observer.disconnect()
      window.clearTimeout(fallback)
    }
  }, [target])

  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated ${className ?? ''}`}>
      <div
        ref={ref}
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(target)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="progress-fill h-full rounded-full"
        style={{ width, backgroundColor: color }}
      />
    </div>
  )
}
