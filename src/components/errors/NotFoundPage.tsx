import { Link } from 'react-router-dom'
import { LostPathIllustration } from './ErrorState'

/**
 * 404 — nothing is wrong with the user's money, so this is the one error
 * that's allowed a little charm: the V mark wanders off a dotted path.
 */
export function NotFoundPage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <LostPathIllustration />
      <h1 className="mt-6 text-[20px] font-semibold text-text-primary">
        This page went missing
      </h1>
      <p className="mt-1.5 max-w-sm text-[14px] text-text-secondary">
        The address doesn't match anything in Vallety. Let's get you somewhere
        useful.
      </p>
      <Link
        to="/"
        className="btn-accent mt-6 inline-flex h-10 items-center rounded-md px-4 text-[14px] font-semibold text-white"
        style={{ backgroundColor: 'var(--color-accent)', transition: 'var(--transition-fast)' }}
      >
        Go to dashboard
      </Link>
    </div>
  )
}
