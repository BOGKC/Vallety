import { useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import { APPROX_DISCLAIMER } from '../../lib/taxEstimate'

// Mandatory "approximate estimate" notices for the simplified tax model. Two
// variants, both calm/muted and theme-aware (light + dark) via CSS variables:
//   <ApproxBadge>   — inline, sits next to any estimated figure. Always-visible
//                     "Approximate estimate" label + an info dot that reveals the
//                     exact percentages on tap/hover.
//   <ApproxNotice>  — the fuller disclaimer panel for heros / the tax section.

/** Small info dot that toggles a popover (works on tap and hover/focus). */
function InfoDot({ detail }: { detail: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label="How this estimate is calculated"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center text-text-muted hover:text-text-secondary focus:outline-none focus-visible:text-text-secondary"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2 rounded-md border px-3 py-2 text-[11px] leading-relaxed shadow-lg"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-secondary)',
          }}
        >
          {detail}
        </span>
      )}
    </span>
  )
}

/**
 * Inline badge for right next to an estimated figure. The label is always
 * visible; the info dot discloses which percentages were used.
 */
export function ApproxBadge({ detail, className = '' }: { detail: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium ${className}`}
      style={{ color: 'var(--text-muted)' }}
    >
      Approximate estimate
      <InfoDot detail={detail} />
    </span>
  )
}

/**
 * The fuller, calm disclaimer panel — for the take-home hero and the tax
 * section. Never collapsed, never hidden. `detail` (the exact rates) is shown
 * inline so the model's limits are always legible.
 */
export function ApproxNotice({ detail, className = '' }: { detail?: string; className?: string }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-md border px-3.5 py-3 ${className}`}
      style={{
        backgroundColor: 'var(--color-info-muted)',
        borderColor: 'var(--border-default)',
      }}
      role="note"
    >
      <Info className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-info)' }} />
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-text-primary">Approximate estimate</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-text-secondary">{APPROX_DISCLAIMER}</p>
        {detail && <p className="mt-1 text-[11px] leading-relaxed text-text-muted">{detail}</p>}
      </div>
    </div>
  )
}
