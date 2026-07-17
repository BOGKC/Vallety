import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useAppStore } from '../shared/store/appStore'
import { useResolvedTheme } from '../shared/hooks/useResolvedTheme'

/* ══════════════════════════════════════════════════════════════════
   BACKGROUND CONFIG — tune everything here.
   Layers: aurora (gradient mesh), particles (canvas dust), grid
   (perspective data-landscape), waves (flow lines), cursorGlow.
   intensity: 'subtle' (default) | 'medium'
   ══════════════════════════════════════════════════════════════════ */
const BG_CONFIG = {
  /* Soft drifting accent blobs — the primary, calmest layer. */
  aurora: { enabled: true, intensity: 'subtle' as 'subtle' | 'medium' },
  /* Slow-drifting dust motes on a canvas. connectingLines draws the
     faint "constellation" network between nearby particles. */
  particles: { enabled: true, count: 40, connectingLines: false },
  /* Faint grid. style: 'perspective' scrolls toward the viewer,
     'flat' breathes in place. */
  grid: { enabled: false, style: 'perspective' as 'perspective' | 'flat' },
  /* Stylised market-flow sine strokes in the lower third. */
  waves: { enabled: false },
  /* Soft pool of light trailing the pointer. Desktop only. */
  cursorGlow: { enabled: true },
}

/* Per-mode color set: two blob colors (accent + shifted hue for soft
   mixing), a line color, and the raw RGB for canvas particles. */
const MODE_FX: Record<string, { a: string; b: string; line: string; rgb: [number, number, number] }> = {
  personal: {
    a: 'rgba(59, 91, 219, 0.07)',
    b: 'rgba(108, 138, 240, 0.05)',
    line: 'rgba(59, 91, 219, 0.04)',
    rgb: [59, 91, 219],
  },
  business: {
    a: 'rgba(15, 157, 122, 0.07)',
    b: 'rgba(93, 202, 165, 0.05)',
    line: 'rgba(15, 157, 122, 0.04)',
    rgb: [15, 157, 122],
  },
  investment: {
    a: 'rgba(147, 51, 234, 0.07)',
    b: 'rgba(196, 181, 253, 0.05)',
    line: 'rgba(147, 51, 234, 0.04)',
    rgb: [147, 51, 234],
  },
}

/* ── Wave geometry (module-level, deterministic) ────────────────────── */

function wavePath(amp: number, wavelength: number, phase: number, y: number): string {
  const pts: string[] = []
  for (let x = 0; x <= 2000; x += 25) {
    const yy = y + amp * Math.sin((x / wavelength) * Math.PI * 2 + phase)
    pts.push(`${x === 0 ? 'M' : 'L'} ${x} ${yy.toFixed(1)}`)
  }
  return pts.join(' ')
}

const WAVES = [
  { d: wavePath(26, 520, 0.0, 160), cls: 'bgfx-wave-1', opacity: 0.5, width: 1.5 },
  { d: wavePath(34, 680, 1.8, 220), cls: 'bgfx-wave-2', opacity: 0.35, width: 1.5 },
  { d: wavePath(20, 430, 3.4, 270), cls: 'bgfx-wave-3', opacity: 0.25, width: 1 },
  { d: wavePath(30, 590, 5.1, 320), cls: 'bgfx-wave-4', opacity: 0.18, width: 1 },
]

interface Particle {
  x: number
  y: number
  size: number
  alpha: number
  vy: number // px/s upward
  vxAmp: number // px/s horizontal sway amplitude
  phase: number
}

/**
 * Ambient animated background: sits behind all content (negative z-index,
 * pointer-events none), colored by the active mode's accent with an 800ms
 * crossfade on mode switch. All motion is slow and low-opacity — atmosphere,
 * not decoration. Canvas work pauses when the tab is hidden; reduced-motion
 * users get a static aurora only.
 */
export function AnimatedBackground() {
  const mode = useAppStore((s) => s.mode)
  const theme = useResolvedTheme()
  const fx = MODE_FX[mode] ?? MODE_FX.personal
  // Accent dust on white is fainter than on navy — lift its alpha in light mode
  // so it stays visible without becoming distracting.
  const particleAlpha = theme === 'light' ? 1.6 : 1

  const [reduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  const [finePointer] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: fine)').matches &&
      window.innerWidth >= 768
  )

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const rgbTarget = useRef<[number, number, number]>(fx.rgb)

  // Retarget the canvas particle color on mode switch (lerped in the loop).
  useEffect(() => {
    rgbTarget.current = (MODE_FX[mode] ?? MODE_FX.personal).rgb
  }, [mode])

  /* ── Layer 2: canvas particles ── */
  useEffect(() => {
    if (!BG_CONFIG.particles.enabled || reduced) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const isMobile = window.innerWidth < 768
    const count = Math.max(8, Math.round(BG_CONFIG.particles.count * (isMobile ? 0.5 : 1)))
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let w = 0
    let h = 0

    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const spawn = (): Particle => {
      const size = 0.6 + Math.random() * 1.2
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        size,
        // Smaller/dimmer particles drift slower — cheap parallax depth.
        alpha: 0.15 + (size / 1.8) * 0.25,
        vy: 10 + size * 14, // ~20–40s to cross a tall viewport
        vxAmp: 3 + Math.random() * 7,
        phase: Math.random() * Math.PI * 2,
      }
    }
    const parts: Particle[] = Array.from({ length: count }, spawn)

    // Current color lerps toward rgbTarget over ~800ms for mode crossfade.
    const cur: [number, number, number] = [...rgbTarget.current]

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(50, now - last) / 1000
      last = now

      const t = rgbTarget.current
      const k = 1 - Math.exp(-dt * 3.75) // ≈800ms settle
      cur[0] += (t[0] - cur[0]) * k
      cur[1] += (t[1] - cur[1]) * k
      cur[2] += (t[2] - cur[2]) * k
      const rgb = `${Math.round(cur[0])}, ${Math.round(cur[1])}, ${Math.round(cur[2])}`

      ctx.clearRect(0, 0, w, h)

      for (const p of parts) {
        p.y -= p.vy * dt
        p.x += Math.sin(now / 4000 + p.phase) * p.vxAmp * dt
        if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w }
        if (p.x < -4) p.x = w + 4
        else if (p.x > w + 4) p.x = -4
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb}, ${Math.min(0.7, p.alpha * particleAlpha)})`
        ctx.fill()
      }

      if (BG_CONFIG.particles.connectingLines) {
        for (let i = 0; i < parts.length; i++) {
          for (let j = i + 1; j < parts.length; j++) {
            const dx = parts[i].x - parts[j].x
            const dy = parts[i].y - parts[j].y
            const d2 = dx * dx + dy * dy
            if (d2 < 120 * 120) {
              const a = (1 - Math.sqrt(d2) / 120) * 0.06
              ctx.beginPath()
              ctx.moveTo(parts[i].x, parts[i].y)
              ctx.lineTo(parts[j].x, parts[j].y)
              ctx.strokeStyle = `rgba(${rgb}, ${a.toFixed(3)})`
              ctx.lineWidth = 0.5
              ctx.stroke()
            }
          }
        }
      }

      raf = requestAnimationFrame(tick)
    }

    // Pause entirely while the tab is hidden.
    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduced, particleAlpha])

  /* ── Layer 5: cursor glow (desktop only) ── */
  useEffect(() => {
    if (!BG_CONFIG.cursorGlow.enabled || reduced || !finePointer) return
    const el = glowRef.current
    if (!el) return

    const target = { x: window.innerWidth / 2, y: window.innerHeight * 0.4 }
    const pos = { ...target }
    const onMove = (e: MouseEvent) => {
      target.x = e.clientX
      target.y = e.clientY
    }
    window.addEventListener('mousemove', onMove, { passive: true })

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(50, now - last) / 1000
      last = now
      const k = 1 - Math.exp(-dt * 6) // smooth trailing lag
      pos.x += (target.x - pos.x) * k
      pos.y += (target.y - pos.y) * k
      el.style.transform = `translate3d(${(pos.x - 200).toFixed(1)}px, ${(pos.y - 200).toFixed(1)}px, 0)`
      raf = requestAnimationFrame(tick)
    }
    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduced, finePointer])

  // Base intensity from config × the per-theme aurora knob (CSS var), so light
  // mode can lift the pale accent tints just enough to read on white.
  const auroraOpacity = `calc(${BG_CONFIG.aurora.intensity === 'medium' ? 1 : 0.75} * var(--fx-aurora-opacity, 1))`

  return (
    <div
      aria-hidden
      className="bgfx pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        zIndex: -10,
        '--bgfx-a': fx.a,
        '--bgfx-b': fx.b,
        '--bgfx-line': fx.line,
      } as CSSProperties}
    >
      {/* Layer 1 — aurora gradient mesh */}
      {BG_CONFIG.aurora.enabled && (
        <div className="absolute inset-0" style={{ opacity: auroraOpacity }}>
          <div
            className={`bgfx-blob bgfx-blob--a ${reduced ? '' : 'bgfx-drift-1'}`}
            style={{ width: 800, height: 800, top: -220, left: -180 }}
          />
          <div
            className={`bgfx-blob bgfx-blob--b ${reduced ? '' : 'bgfx-drift-2'}`}
            style={{ width: 900, height: 900, bottom: -280, right: -220 }}
          />
          {!reduced && (
            <div
              className="bgfx-blob bgfx-blob--a bgfx-drift-3"
              style={{ width: 620, height: 620, top: '32%', left: '52%', opacity: 0.7 }}
            />
          )}
        </div>
      )}

      {/* Layer 3 — grid (off by default) */}
      {BG_CONFIG.grid.enabled && !reduced && (
        <div
          className={`bgfx-grid ${
            BG_CONFIG.grid.style === 'perspective' ? 'bgfx-grid--perspective' : 'bgfx-grid--flat'
          }`}
        />
      )}

      {/* Layer 4 — flow waves (off by default), lower third only */}
      {BG_CONFIG.waves.enabled && !reduced && (
        <svg
          className="absolute bottom-0 left-0 h-[38%] w-[200%]"
          viewBox="0 0 2000 400"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="bgfx-wavegrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="transparent" />
              <stop offset="0.2" style={{ stopColor: 'var(--bgfx-a)' }} />
              <stop offset="0.8" style={{ stopColor: 'var(--bgfx-a)' }} />
              <stop offset="1" stopColor="transparent" />
            </linearGradient>
          </defs>
          {WAVES.map((wv) => (
            <path
              key={wv.cls}
              d={wv.d}
              className={`bgfx-wave ${wv.cls}`}
              fill="none"
              stroke="url(#bgfx-wavegrad)"
              strokeWidth={wv.width}
              opacity={wv.opacity}
            />
          ))}
        </svg>
      )}

      {/* Layer 2 — particles */}
      {BG_CONFIG.particles.enabled && !reduced && (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      )}

      {/* Layer 5 — cursor glow */}
      {BG_CONFIG.cursorGlow.enabled && !reduced && finePointer && (
        <div ref={glowRef} className="bgfx-glow" style={{ top: 0, left: 0 }} />
      )}
    </div>
  )
}
