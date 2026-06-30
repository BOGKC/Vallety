import { useEffect, useState } from 'react'

/**
 * Returns `true` for at least `ms` after mount so skeleton placeholders don't
 * flash in and out on fast (synchronous) loads. Data is read synchronously
 * from localStorage, so this is purely a smoothing floor, not a real wait.
 */
export function useMinLoading(ms = 150): boolean {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const id = window.setTimeout(() => setLoading(false), ms)
    return () => window.clearTimeout(id)
  }, [ms])
  return loading
}
