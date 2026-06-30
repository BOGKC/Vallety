import type { LucideIcon } from 'lucide-react'

interface PrimaryAction {
  label: string
  onClick: () => void
  icon?: LucideIcon
}

interface SecondaryAction {
  label: string
  onClick: () => void
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  primaryAction?: PrimaryAction
  secondaryAction?: SecondaryAction
  /** Reduced padding / smaller icon + title, for use inside cards. */
  compact?: boolean
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  compact = false,
}: EmptyStateProps) {
  const PrimaryIcon = primaryAction?.icon
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ padding: compact ? '24px 16px' : '48px 24px' }}
    >
      <Icon
        size={compact ? 32 : 44}
        style={{ color: 'var(--text-muted)', marginBottom: 16 }}
      />
      <h3
        className="font-semibold text-text-primary"
        style={{ fontSize: compact ? 14 : 16, marginBottom: 8 }}
      >
        {title}
      </h3>
      <p
        className="text-text-secondary"
        style={{ fontSize: 14, maxWidth: 320, lineHeight: 1.6, marginBottom: 24 }}
      >
        {description}
      </p>

      {primaryAction && (
        <button
          onClick={primaryAction.onClick}
          className="inline-flex items-center justify-center gap-1.5 rounded-md px-5 text-[14px] font-semibold text-white"
          style={{ backgroundColor: 'var(--color-accent)', height: 44, transition: 'var(--transition-fast)' }}
        >
          {PrimaryIcon && <PrimaryIcon size={16} />}
          {primaryAction.label}
        </button>
      )}

      {secondaryAction && (
        <button
          onClick={secondaryAction.onClick}
          className="text-text-secondary hover:text-text-primary"
          style={{ marginTop: 12, fontSize: 14, transition: 'var(--transition-fast)' }}
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  )
}
