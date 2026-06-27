interface SkeletonBlockProps {
  width?: number | string
  height?: number | string
  borderRadius?: number | string
  className?: string
}

/** Shimmering placeholder block for loading states. */
export function SkeletonBlock({
  width = '100%',
  height = 16,
  borderRadius = 'var(--radius-sm)',
  className,
}: SkeletonBlockProps) {
  return (
    <div
      className={`skeleton ${className ?? ''}`}
      style={{ width, height, borderRadius }}
      aria-hidden
    />
  )
}
