import { ValletyMark } from '../../components/ValletyLogo'
import { CircleSpinner } from '../../components/loaders'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 16, md: 32, lg: 48 }

export function LoadingSpinner({ size = 'md', className = '' }: Props) {
  return <CircleSpinner size={sizes[size]} className={className} />
}

/** Branded full-page wait: the mark above a quiet accent spinner. */
export function FullPageSpinner() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-5 bg-bg-primary"
      role="status"
      aria-label="Loading"
    >
      <ValletyMark size={56} />
      <CircleSpinner size={22} />
    </div>
  )
}
