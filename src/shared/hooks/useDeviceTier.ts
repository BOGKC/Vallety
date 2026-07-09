import { useSyncExternalStore } from 'react'

/**
 * Three-tier responsive system with touch awareness, so a touch tablet in
 * landscape gets touch-sized chrome even though it's wide:
 *
 *   mobile           < 768px            → bottom tab bar, sheets, 1 column
 *   tablet-portrait  768–1023px         → icon-rail nav, 2–3 columns
 *   tablet-landscape ≥1024px & coarse   → touch sidebar, master-detail
 *                    pointer (≤1366)
 *   desktop          ≥1024px fine, or   → full sidebar, modals
 *                    >1366px
 *
 * Width + `(pointer: coarse)` + `(orientation)` are all read via matchMedia so
 * the value updates live on resize AND rotation (no layout thrashing — one
 * subscription, one snapshot).
 */

export type DeviceTier = 'mobile' | 'tablet-portrait' | 'tablet-landscape' | 'desktop'
export type Orientation = 'portrait' | 'landscape'

export interface DeviceInfo {
  tier: DeviceTier
  orientation: Orientation
  isTouch: boolean
  /** Any tablet tier — convenient for shared tablet branches. */
  isTablet: boolean
  width: number
}

const QUERIES = [
  '(min-width: 768px)',
  '(min-width: 1024px)',
  '(max-width: 1366px)',
  '(pointer: coarse)',
  '(orientation: portrait)',
]

function subscribe(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const mqls = QUERIES.map((q) => window.matchMedia(q))
  mqls.forEach((m) => m.addEventListener('change', cb))
  window.addEventListener('resize', cb)
  return () => {
    mqls.forEach((m) => m.removeEventListener('change', cb))
    window.removeEventListener('resize', cb)
  }
}

// Cache the snapshot so useSyncExternalStore sees a stable reference between
// changes (returning a fresh object every call would loop).
let cached: DeviceInfo | null = null

function compute(): DeviceInfo {
  const width = window.innerWidth
  const isTouch = window.matchMedia('(pointer: coarse)').matches
  const orientation: Orientation = window.matchMedia('(orientation: portrait)').matches
    ? 'portrait'
    : 'landscape'

  let tier: DeviceTier
  if (width < 768) tier = 'mobile'
  else if (width < 1024) tier = 'tablet-portrait'
  else if (isTouch && width <= 1366) tier = 'tablet-landscape'
  else tier = 'desktop'

  return {
    tier,
    orientation,
    isTouch,
    isTablet: tier === 'tablet-portrait' || tier === 'tablet-landscape',
    width,
  }
}

function getSnapshot(): DeviceInfo {
  const next = compute()
  if (
    !cached ||
    cached.tier !== next.tier ||
    cached.orientation !== next.orientation ||
    cached.isTouch !== next.isTouch ||
    cached.width !== next.width
  ) {
    cached = next
  }
  return cached
}

// SSR / non-DOM fallback (also used before first client read).
const SERVER_SNAPSHOT: DeviceInfo = {
  tier: 'desktop', orientation: 'landscape', isTouch: false, isTablet: false, width: 1280,
}

export function useDeviceTier(): DeviceInfo {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT)
}
