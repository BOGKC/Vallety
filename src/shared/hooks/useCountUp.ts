import { useEffect, useRef, useState } from 'react'

/**
 * Animate a number to `target` over `duration` ms using requestAnimationFrame
 * with a cubic ease-out. Counts up from 0 on first mount (initial page load)
 * and from the previous value when `target` changes thereafter. Near-zero
 * targets snap. Honors prefers-reduced-motion.
 */
export function useCountUp(target: number, duration = 500): number {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (reduce || Math.abs(target - from) < 1) {
      fromRef.current = target
      const id = requestAnimationFrame(() => setValue(target))
      return () => cancelAnimationFrame(id)
    }

    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (target - from) * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
        setValue(target)
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      fromRef.current = target
    }
  }, [target, duration])

  return value
}
