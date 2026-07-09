/**
 * A rewarding completion moment: the checkmark draws itself inside a circle
 * while a ring of accent particles bursts outward. Brief, non-blocking, and
 * fully static under reduced motion (the mark still shows).
 */

const PARTICLES = 10
const RADIUS = 46

export function SuccessBurst({ size = 56 }: { size?: number }) {
  return (
    <span className="relative inline-flex items-center justify-center" aria-hidden>
      {/* Particle ring */}
      {Array.from({ length: PARTICLES }, (_, i) => {
        const angle = (i / PARTICLES) * Math.PI * 2
        return (
          <span
            key={i}
            className="burst-particle absolute h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: i % 3 === 0 ? 'var(--color-success)' : 'var(--color-accent)',
              ['--bx' as string]: `${Math.cos(angle) * RADIUS}px`,
              ['--by' as string]: `${Math.sin(angle) * RADIUS}px`,
            }}
          />
        )
      })}
      {/* Draw-on checkmark (reuses the csv-check keyframes) */}
      <svg width={size} height={size} viewBox="0 0 52 52">
        <circle
          className="csv-check__circle"
          cx="26" cy="26" r="24" fill="none"
          stroke="var(--color-accent)" strokeWidth="3"
        />
        <path
          className="csv-check__tick"
          d="M16 27 L23 34 L37 19" fill="none"
          stroke="var(--color-accent)" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
