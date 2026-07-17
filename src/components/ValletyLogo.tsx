import { useId } from 'react'

/**
 * The Vallety logo system (from the Claude Design "Vallety — Logo System"
 * spec): a V whose right arm rises past the left and ends in an upward
 * arrowhead — value trending up. One source of truth for every mark in the
 * app; favicon.svg and the PWA icons mirror this exact geometry.
 *
 * Geometry (48×48 viewBox):
 *   V stroke:  M9 15 → 22.5 38 → 34 20.1  (right arm continues under the tip)
 *   Arrowhead: filled triangle, apex 40.5 10, aligned to the arm's direction.
 */

export const VALLETY_V_PATH = 'M9 15 L22.5 38 L34 20.1'
export const VALLETY_ARROW_PATH = 'M40.5 10 L38.7 21.3 L30.9 16.3 Z'
/** V stroke length, used by draw-on animations (stroke-dashoffset). */
export const VALLETY_V_LENGTH = 60

interface MarkProps {
  /** Rendered square size in px. */
  size?: number
  /**
   * - 'accent'  — gradient in the active mode's accent (default)
   * - 'white'   — mono white, for use on accent-filled surfaces
   * - 'current' — inherits CSS `color`, for custom contexts
   */
  tone?: 'accent' | 'white' | 'current'
  className?: string
  /** Accessible label. Omit (default) to hide from screen readers. */
  title?: string
}

/** The V-arrow mark. Mode-aware: the gradient follows --accent-500/600. */
export function ValletyMark({ size = 32, tone = 'accent', className, title }: MarkProps) {
  const gradId = useId()
  const paint =
    tone === 'accent' ? `url(#${gradId})` : tone === 'white' ? '#FFFFFF' : 'currentColor'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {tone === 'accent' && (
        <defs>
          <linearGradient id={gradId} x1="9" y1="38" x2="40" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--accent-600, #2F49B0)" />
            <stop offset="55%" stopColor="var(--accent-500, #3B5BDB)" />
            <stop offset="100%" stopColor="color-mix(in srgb, var(--accent-500, #3B5BDB) 55%, var(--logo-tip-mix, #F4F7FF))" />
          </linearGradient>
        </defs>
      )}
      <path d={VALLETY_V_PATH} stroke={paint} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Slim stroke with round joins softens the triangle's corners. */}
      <path d={VALLETY_ARROW_PATH} fill={paint} stroke={paint} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Horizontal lockup: mark + lowercase wordmark (the design's wordmark is
 * lowercase "vallety"). Used on auth pages and anywhere the brand headlines.
 */
export function ValletyLockup({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <ValletyMark size={size} title="Vallety" />
      <span
        className="font-semibold text-text-primary"
        style={{ fontSize: Math.round(size * 0.58), letterSpacing: '-0.02em' }}
      >
        vallety
      </span>
    </div>
  )
}
