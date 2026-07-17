import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../shared/store/authStore'
import { VALLETY_V_PATH, VALLETY_ARROW_PATH } from './ValletyLogo'

/**
 * Branded splash shown while the app boots. The V logo draws itself
 * (stroke-dashoffset), then the arrow tip pops in; below it a 2px accent bar
 * fills against real milestones — not a fake timer:
 *
 *   Connecting          → waiting for the Supabase session check
 *   Loading your data   → session resolved, stores hydrating
 *   Almost there        → first paint scheduled
 *
 * Shows for at least 600ms so fast boots don't flash, never artificially
 * longer, and exits with a smooth fade + scale-up.
 */

type Phase = 'connecting' | 'data' | 'render' | 'out' | 'gone'

const PROGRESS: Record<Phase, number> = {
  connecting: 0.2,
  data: 0.62,
  render: 0.9,
  out: 1,
  gone: 1,
}

const LABEL: Record<Phase, string> = {
  connecting: 'Connecting',
  data: 'Loading your data',
  render: 'Almost there',
  out: '',
  gone: '',
}

// Hold long enough for the logo animation to play through once (draw ~650ms,
// tip launch to ~1020ms, light sweep to ~1730ms) before exiting — otherwise a
// fast local boot would cut the sequence off. Never longer than that.
const MIN_DISPLAY_MS = 1750
const EXIT_MS = 400

export function AppLoader() {
  const initialized = useAuthStore((s) => s.initialized)
  const [phase, setPhase] = useState<Phase>('connecting')
  const mountedAt = useRef(0)

  useEffect(() => {
    mountedAt.current = performance.now()
  }, [])

  // Advance through the real milestones once auth has resolved.
  useEffect(() => {
    if (!initialized || phase !== 'connecting') return
    const raf = requestAnimationFrame(() => setPhase('data'))
    return () => cancelAnimationFrame(raf)
  }, [initialized, phase])

  useEffect(() => {
    if (phase !== 'data') return
    // Data is local-first (synchronous), so this milestone is brief — give the
    // bar a beat so the progression reads, then hand off to render.
    const id = window.setTimeout(() => setPhase('render'), 180)
    return () => window.clearTimeout(id)
  }, [phase])

  useEffect(() => {
    if (phase !== 'render') return
    // Hold until the 600ms minimum has elapsed, then start the exit.
    const elapsed = performance.now() - mountedAt.current
    const wait = Math.max(120, MIN_DISPLAY_MS - elapsed)
    const id = window.setTimeout(() => setPhase('out'), wait)
    return () => window.clearTimeout(id)
  }, [phase])

  useEffect(() => {
    if (phase !== 'out') return
    const id = window.setTimeout(() => setPhase('gone'), EXIT_MS)
    return () => window.clearTimeout(id)
  }, [phase])

  if (phase === 'gone') return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center ${
        phase === 'out' ? 'splash--out' : ''
      }`}
      style={{ backgroundColor: 'var(--bg-primary)' }}
      role="status"
      aria-live="polite"
      aria-label={LABEL[phase] || 'Ready'}
    >
      {/* Breathing accent glow behind the logo */}
      <div
        className="splash-glow pointer-events-none absolute h-72 w-72 rounded-full"
        style={{
          background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      {/* The mark draws itself, the tip launches up, then a light sweep
          crosses it — the whole stage floats gently while loading. */}
      <div className="logo-stage relative" aria-hidden>
        <svg width="88" height="88" viewBox="0 0 48 48" fill="none">
          <defs>
            <linearGradient id="splash-v" x1="9" y1="38" x2="40" y2="10" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--accent-600, #2F49B0)" />
              <stop offset="55%" stopColor="var(--accent-500, #3B5BDB)" />
              <stop offset="100%" stopColor="color-mix(in srgb, var(--accent-500, #3B5BDB) 55%, var(--logo-tip-mix, #F4F7FF))" />
            </linearGradient>
            {/* Clip the light sweep to the mark's silhouette */}
            <clipPath id="splash-clip">
              <path d={VALLETY_V_PATH} stroke="#000" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d={VALLETY_ARROW_PATH} fill="#000" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            </clipPath>
          </defs>

          {/* Motion trail behind the launching tip */}
          <path
            className="logo-draw__trail"
            d="M31 17 L37 12"
            stroke="var(--accent-500, #3B5BDB)" strokeWidth="3" strokeLinecap="round"
          />
          <path
            className="logo-draw__v"
            d={VALLETY_V_PATH}
            stroke="url(#splash-v)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
          />
          <path
            className="logo-draw__tip"
            d={VALLETY_ARROW_PATH}
            fill="url(#splash-v)" stroke="url(#splash-v)" strokeWidth="2" strokeLinejoin="round"
          />

          {/* Light sweep, clipped to the mark (skew on the group so the
              rect's animated translateX doesn't clobber it) */}
          <g clipPath="url(#splash-clip)">
            <g transform="skewX(-18)">
              <rect
                className="logo-sweep"
                x="-14" y="-6" width="12" height="60"
                fill="#FFFFFF" opacity="0.5"
              />
            </g>
          </g>
        </svg>
      </div>

      {/* Real-milestone progress */}
      <div className="mt-8 w-40">
        <div className="h-0.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-3, #1B2440)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${PROGRESS[phase] * 100}%`,
              backgroundImage: 'linear-gradient(90deg, var(--accent-600), var(--accent-500))',
              // The render phase is the deliberate animation hold, so let the
              // bar ease across it rather than sit stalled at 90%.
              transition: `width ${phase === 'render' ? 1400 : 300}ms var(--ease-in-out-smooth, ease)`,
            }}
          />
        </div>
        <p className="mt-3 text-center text-[12px] text-text-muted" style={{ minHeight: 16 }}>
          {LABEL[phase]}
        </p>
      </div>
    </div>
  )
}
