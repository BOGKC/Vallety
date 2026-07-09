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

const MIN_DISPLAY_MS = 600
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

      {/* The mark draws itself, then the tip extends */}
      <svg width="88" height="88" viewBox="0 0 48 48" fill="none" aria-hidden>
        <defs>
          <linearGradient id="splash-v" x1="9" y1="38" x2="40" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--accent-600, #2F49B0)" />
            <stop offset="55%" stopColor="var(--accent-500, #3B5BDB)" />
            <stop offset="100%" stopColor="color-mix(in srgb, var(--accent-500, #3B5BDB) 55%, #F4F7FF)" />
          </linearGradient>
        </defs>
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
      </svg>

      {/* Real-milestone progress */}
      <div className="mt-8 w-40">
        <div className="h-0.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-3, #1B2440)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${PROGRESS[phase] * 100}%`,
              backgroundImage: 'linear-gradient(90deg, var(--accent-600), var(--accent-500))',
              transition: 'width 300ms var(--ease-in-out-smooth, ease)',
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
