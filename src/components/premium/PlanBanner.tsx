import { useState } from 'react'
import { Sparkles, AlertTriangle, X } from 'lucide-react'
import { usePlan } from '../../shared/hooks/usePlan'
import { useUpgrade } from './UpgradeModalProvider'

/**
 * A single, dismissible top banner reflecting plan state — trial countdown,
 * or a past-due / cancelled grace message. Never more than one, never blocks
 * core functionality. Respects the "don't nag" rule: dismissible per session.
 */
export function PlanBanner() {
  const { isTrialing, daysLeftInTrial, planStatus, plan } = usePlan()
  const { open } = useUpgrade()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  let content: { tone: 'accent' | 'warning'; icon: typeof Sparkles; text: string; cta?: string } | null = null

  if (isTrialing) {
    content = {
      tone: 'accent', icon: Sparkles, cta: 'Upgrade',
      text: `${daysLeftInTrial} day${daysLeftInTrial === 1 ? '' : 's'} left in your trial — upgrade to keep premium.`,
    }
  } else if (planStatus === 'past_due') {
    content = {
      tone: 'warning', icon: AlertTriangle, cta: 'Update payment',
      text: 'Your payment didn’t go through. Update it to keep premium features.',
    }
  } else if (planStatus === 'cancelled') {
    content = {
      tone: 'warning', icon: AlertTriangle, cta: 'Resubscribe',
      text: 'Your plan is cancelled — premium stays active until your renewal date, then reverts to Free.',
    }
  }

  if (!content) return null
  const Icon = content.icon
  const accent = content.tone === 'accent'

  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2 text-[13px]"
      style={{
        backgroundColor: accent ? 'var(--color-accent-muted)' : 'var(--color-warning-muted)',
        borderBottom: `1px solid ${accent ? 'var(--color-accent)' : 'var(--color-warning)'}`,
        color: accent ? 'var(--color-accent)' : 'var(--color-warning)',
      }}
      role="status"
      aria-live="polite"
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="min-w-0 flex-1 truncate text-text-primary">{content.text}</span>
      {content.cta && (
        <button onClick={() => open(plan === 'free' ? undefined : plan)} className="flex-shrink-0 font-semibold underline-offset-2 hover:underline">
          {content.cta}
        </button>
      )}
      <button onClick={() => setDismissed(true)} className="flex-shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
