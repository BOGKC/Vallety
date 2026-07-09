import type { ReactNode } from 'react'

/**
 * Shared full-page error layout: a calm geometric illustration, plain-language
 * heading + body, and always at least one recovery action. Raw error details
 * never render here — they belong in the console/monitoring.
 */

export function ErrorActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex items-center gap-2">{children}</div>
}

export function PrimaryAction({
  onClick, href, children,
}: { onClick?: () => void; href?: string; children: ReactNode }) {
  const cls = 'btn-accent inline-flex h-10 items-center rounded-md px-4 text-[14px] font-semibold text-white'
  const style = { backgroundColor: 'var(--color-accent)', transition: 'var(--transition-fast)' }
  return href ? (
    <a href={href} className={cls} style={style}>{children}</a>
  ) : (
    <button onClick={onClick} className={cls} style={style}>{children}</button>
  )
}

export function SecondaryAction({
  onClick, href, children,
}: { onClick?: () => void; href?: string; children: ReactNode }) {
  const cls = 'inline-flex h-10 items-center rounded-md border px-4 text-[14px] font-medium hover:bg-bg-elevated'
  const style = {
    borderColor: 'var(--border-default)',
    color: 'var(--text-secondary)',
    transition: 'var(--transition-fast)',
  }
  return href ? (
    <a href={href} className={cls} style={style}>{children}</a>
  ) : (
    <button onClick={onClick} className={cls} style={style}>{children}</button>
  )
}

/**
 * Gently disconnected geometric shape — two halves of a rounded square that
 * drifted apart, with the accent dot that should join them. Tasteful, not a
 * cartoon.
 */
export function BrokenShapeIllustration() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" className="error-float" aria-hidden>
      <path
        d="M30 22 h-4 a8 8 0 0 0-8 8 v36 a8 8 0 0 0 8 8 h14"
        stroke="var(--color-accent)" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round"
      />
      <path
        d="M60 22 h10 a8 8 0 0 1 8 8 v36 a8 8 0 0 1-8 8 h-10"
        stroke="var(--color-accent)" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round"
        transform="translate(6 -4) rotate(4 65 48)"
      />
      <circle cx="48" cy="48" r="4" fill="var(--color-accent)" />
      <circle cx="48" cy="48" r="9" stroke="var(--color-accent)" strokeOpacity="0.25" strokeWidth="2" />
    </svg>
  )
}

/** A dotted path that wanders off to nowhere — for 404s. */
export function LostPathIllustration() {
  return (
    <svg width="140" height="96" viewBox="0 0 140 96" fill="none" className="error-float" aria-hidden>
      <path
        d="M12 80 C 40 78, 44 56, 66 52 S 108 44, 116 24"
        stroke="var(--color-accent)" strokeOpacity="0.5" strokeWidth="3"
        strokeLinecap="round" strokeDasharray="1 10"
      />
      {/* The V mark, a little lost at the end of the path */}
      <g transform="translate(104 4) scale(0.55)">
        <path
          d="M9 15 L22.5 38 L34 20.1"
          stroke="var(--color-accent)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
        />
        <path
          d="M40.5 10 L38.7 21.3 L30.9 16.3 Z"
          fill="var(--color-accent)" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round"
        />
      </g>
      <circle cx="12" cy="80" r="3.5" fill="var(--color-accent)" fillOpacity="0.5" />
    </svg>
  )
}
