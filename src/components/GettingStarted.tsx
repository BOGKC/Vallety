import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ArrowLeftRight, Target, Sparkles, Wallet, Play } from 'lucide-react'
import { useAuthStore } from '../shared/store/authStore'
import { readProfile, saveProfilePatch } from '../shared/lib/profile'
import { readTransactions } from '../shared/lib/transactions'
import { readBudgets } from '../shared/lib/budgets'
import { readGoals } from '../shared/lib/goals'
import { loadSampleData } from '../shared/lib/demoData'
import { SuccessBurst } from './SuccessBurst'

interface Step {
  key: string
  label: string
  icon: typeof Target
  done: boolean
  to: string
}

/**
 * First-run checklist shown on the dashboard until every step is done (or the
 * user skips). Completion is derived from real data + the profile, and the
 * whole thing is persisted via profile.getting_started_done so it never
 * re-appears. Calm, dismissible — never forced.
 */
export function GettingStarted({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate()
  const authProfile = useAuthStore((s) => s.profile)
  const name = (authProfile?.full_name || readProfile().full_name || '').split(' ')[0]
  const [celebrating, setCelebrating] = useState(false)

  const steps = useMemo<Step[]>(() => {
    const p = readProfile()
    return [
      { key: 'txn', label: 'Add your first transaction (or import a CSV)', icon: ArrowLeftRight, to: '/transactions', done: readTransactions().length > 0 },
      { key: 'budget', label: 'Set your first budget', icon: Target, to: '/budgets', done: readBudgets().length > 0 },
      { key: 'goal', label: 'Create a savings goal', icon: Sparkles, to: '/budgets#goals', done: readGoals().length > 0 },
      { key: 'income', label: 'Set your monthly income', icon: Wallet, to: '/profile#financial', done: !!String(p.monthly_income).trim() },
    ]
  }, [])

  const doneCount = steps.filter((s) => s.done).length
  const allDone = doneCount === steps.length
  const pct = (doneCount / steps.length) * 100

  const finish = () => {
    saveProfilePatch({ getting_started_done: true })
    onDone()
  }

  // All steps complete → celebrate briefly, then collapse to the real dashboard.
  const celebrateAndFinish = () => {
    setCelebrating(true)
    window.setTimeout(finish, 1800)
  }

  const loadSample = () => {
    loadSampleData()
    // Sample data satisfies most steps; reload so the dashboard fills in.
    window.location.reload()
  }

  if (celebrating) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-default bg-bg-card py-12 text-center card-gradient">
        <SuccessBurst size={72} />
        <p className="text-[20px] font-semibold text-text-primary">You're all set!</p>
        <p className="text-[14px] text-text-secondary">Your Vallety is ready. Welcome aboard.</p>
      </div>
    )
  }

  return (
    <section
      className="rounded-lg border border-default bg-bg-card p-5 sm:p-6"
      style={{ backgroundImage: 'var(--card-gradient)' }}
      aria-label="Getting started"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold text-text-primary">
            Welcome to Vallety{name ? `, ${name}` : ''} 👋
          </h2>
          <p className="mt-1 text-[14px] text-text-secondary">
            Let's get your money set up. Start with any of these.
          </p>
        </div>
        <button
          onClick={finish}
          className="flex-shrink-0 text-[13px] text-text-muted hover:text-text-primary"
        >
          Skip
        </button>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[12px] text-text-muted">
          <span>{doneCount} of {steps.length} done</span>
          {allDone && <span style={{ color: 'var(--color-success)' }}>Complete!</span>}
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-3, #1B2440)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              backgroundImage: 'linear-gradient(90deg, var(--accent-600), var(--accent-500))',
              transition: 'width 450ms var(--ease-out-expo)',
            }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="mt-4 flex flex-col gap-2">
        {steps.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.key}
              onClick={() => (s.done ? undefined : navigate(s.to))}
              disabled={s.done}
              className="touch-target flex items-center gap-3 rounded-lg border p-3 text-left disabled:cursor-default"
              style={{
                borderColor: s.done ? 'var(--color-success)' : 'var(--border-default)',
                backgroundColor: s.done ? 'var(--color-success-muted)' : 'var(--bg-elevated)',
                transition: 'var(--transition-fast)',
              }}
            >
              <span
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: s.done ? 'var(--color-success)' : 'var(--color-accent-muted)',
                }}
              >
                {s.done
                  ? <Check className="saved-tick h-4 w-4 text-white" />
                  : <Icon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />}
              </span>
              <span
                className="flex-1 text-[14px]"
                style={{
                  color: s.done ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: s.done ? 'line-through' : 'none',
                }}
              >
                {s.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Sample data + finish */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={loadSample}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-default px-3 text-[13px] font-medium text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
        >
          <Play className="h-3.5 w-3.5" /> Explore with sample data
        </button>
        {allDone && (
          <button
            onClick={celebrateAndFinish}
            className="btn-accent inline-flex h-9 items-center rounded-md px-4 text-[13px] font-semibold text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            Finish setup
          </button>
        )}
      </div>
    </section>
  )
}
