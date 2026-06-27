import { useMemo, useState } from 'react'
import { Snowflake, Flame, Crown, Plus, CreditCard } from 'lucide-react'
import { formatEuro } from '../../shared/lib/formatters'
import { cn } from '../../shared/lib/cn'
import {
  readDebts, simulatePayoff, sortByStrategy, DEBT_TYPE_LABELS,
  type Debt, type Strategy,
} from '../../shared/lib/debts'
import { DebtDrawer } from './DebtDrawer'
import { EmptyState } from '../../components/EmptyState'

function monthYear(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleDateString('en-IE', { month: 'short', year: 'numeric' })
}

function StrategyButton({
  active, icon, title, subtitle, onClick,
}: { active: boolean; icon: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center gap-3 rounded-lg border px-4 py-3 text-left',
        active ? 'text-white' : 'border-default text-text-secondary hover:bg-bg-elevated'
      )}
      style={{
        backgroundColor: active ? 'var(--color-accent)' : 'transparent',
        borderColor: active ? 'var(--color-accent)' : 'var(--border-default)',
        transition: 'var(--transition-base)',
      }}
    >
      <span className={active ? 'text-white' : 'text-text-muted'}>{icon}</span>
      <span className="flex flex-col">
        <span className="text-[14px] font-semibold">{title}</span>
        <span className={cn('text-[12px]', active ? 'text-white/80' : 'text-text-muted')}>{subtitle}</span>
      </span>
    </button>
  )
}

export function DebtTab() {
  const [debts, setDebts] = useState<Debt[]>(() => readDebts())
  const [strategy, setStrategy] = useState<Strategy>('snowball')
  const [extra, setExtra] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const now = useMemo(() => new Date(), [])
  const result = useMemo(() => simulatePayoff(debts, strategy, extra, now), [debts, strategy, extra, now])
  const base = useMemo(() => simulatePayoff(debts, strategy, 0, now), [debts, strategy, now])
  const ordered = useMemo(() => sortByStrategy(debts, strategy), [debts, strategy])

  const hasDebts = debts.length > 0
  const interestSaved = Math.max(0, base.totalInterest - result.totalInterest)
  const monthsSooner = base.payable && result.payable ? Math.max(0, base.months - result.months) : 0

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-text-secondary">
          {hasDebts ? 'Plan your payoff strategy.' : 'Add debts to build a payoff plan.'}
        </p>
        <button
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-white"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <Plus className="h-4 w-4" /> Add debt
        </button>
      </div>

      {hasDebts ? (
        <>
          {/* Strategy toggle */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <StrategyButton
              active={strategy === 'snowball'}
              icon={<Snowflake className="h-5 w-5" />}
              title="Snowball"
              subtitle="Smallest balance first"
              onClick={() => setStrategy('snowball')}
            />
            <StrategyButton
              active={strategy === 'avalanche'}
              icon={<Flame className="h-5 w-5" />}
              title="Avalanche"
              subtitle="Highest interest first"
              onClick={() => setStrategy('avalanche')}
            />
          </div>

          {/* Debt-free callout */}
          <div
            className="mb-4 rounded-md p-4 text-[14px] font-medium text-text-primary"
            style={{
              backgroundColor: 'var(--color-accent-muted)',
              borderLeft: '3px solid var(--color-accent)',
            }}
          >
            {result.payable
              ? `🎯 Debt free by ${monthYear(result.debtFreeDate)} · Total interest: ${formatEuro(result.totalInterest)}`
              : '⚠️ Minimum payments don’t cover interest — increase payments to become debt-free.'}
          </div>

          {/* Extra payment slider */}
          <div className="mb-5 rounded-lg border border-default bg-bg-card p-4">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-text-secondary">Extra monthly payment</label>
              <span className="text-[13px] font-semibold text-text-primary">{formatEuro(extra)}/month extra</span>
            </div>
            <input
              type="range"
              min={0}
              max={1000}
              step={50}
              value={extra}
              onChange={(e) => setExtra(Number(e.target.value))}
              className="mt-3 w-full"
              style={{ accentColor: 'var(--color-accent)' }}
            />
            {extra > 0 && (
              <p className="mt-2 text-[12px] text-text-secondary">
                Saves {formatEuro(interestSaved)} in interest · {monthsSooner} month{monthsSooner === 1 ? '' : 's'} sooner
              </p>
            )}
          </div>

          {/* Debt list */}
          <div className="flex flex-col gap-3">
            {ordered.map((d, i) => {
              const payoff = result.payoff[d.id]
              return (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-md border border-default bg-bg-card p-3.5 transition-all duration-300"
                >
                  {i === 0 && (
                    <Crown className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-warning)' }} aria-label="Next to pay off" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-text-primary">{d.name}</p>
                    <span className="text-[11px] text-text-muted">{DEBT_TYPE_LABELS[d.type]}</span>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[16px] font-semibold text-text-primary">{formatEuro(d.balance)}</p>
                    <span className="text-[12px] text-text-muted">at {d.rate}%</span>
                  </div>
                  <div className="ml-2 flex-shrink-0 text-right">
                    <p className="text-[13px] text-text-secondary">{formatEuro(d.minPayment)}/mo</p>
                    <span className="text-[12px]" style={{ color: 'var(--color-accent)' }}>
                      {monthYear(payoff?.date ?? null)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <EmptyState
          icon={CreditCard}
          title="No debts tracked"
          description="Add your loans, credit cards, or mortgage to create a payoff plan."
          primaryAction={{ label: 'Add a debt', icon: Plus, onClick: () => setDrawerOpen(true) }}
        />
      )}

      <DebtDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSaved={setDebts} />
    </div>
  )
}
