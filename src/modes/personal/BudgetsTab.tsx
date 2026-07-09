import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Plus, Target, Pencil, ChevronLeft } from 'lucide-react'
import { formatEuro } from '../../shared/lib/formatters'
import { getCategoryMeta, hexToRgba } from '../../shared/lib/transactions'
import {
  readBudgets, computeBudgets, usageColor, BUDGET_SUGGESTIONS,
  type Budget, type BudgetView,
} from '../../shared/lib/budgets'
import { BudgetDrawer, type BudgetPrefill } from './BudgetDrawer'
import { ProgressBar } from '../../components/ProgressBar'
import { AnimatedEuro, AnimatedPercent } from '../../components/AnimatedNumber'
import { MasterDetail } from '../../shared/components/MasterDetail'

function SummaryCard({
  value, valueColor, label,
}: { value: ReactNode; valueColor?: string; label: string }) {
  return (
    <div className="rounded-lg border border-default bg-bg-card p-4">
      <p className="text-[20px] font-semibold" style={{ color: valueColor ?? 'var(--text-primary)' }}>
        {value}
      </p>
      <p className="mt-0.5 text-[12px] text-text-muted">{label}</p>
    </div>
  )
}

function BudgetCard({
  view, daysLeft, selected, onSelect,
}: {
  view: BudgetView
  daysLeft: number
  selected?: boolean
  onSelect?: () => void
}) {
  const meta = getCategoryMeta(view.category)
  const Icon = meta.icon
  const pctLabel = Math.round(view.pct)

  const daysChip =
    daysLeft === 0 ? 'Month ends today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
  const daysWarning = daysLeft <= 7

  return (
    <button
      onClick={onSelect}
      className="touch-target w-full rounded-lg border bg-bg-card p-4 text-left transition-transform duration-150 hover:scale-[1.01] hover:bg-bg-elevated"
      style={{ borderColor: selected ? 'var(--color-accent)' : 'var(--border-default)' }}
      aria-pressed={selected}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: hexToRgba(meta.color, 0.15) }}
          >
            <Icon className="h-4 w-4" style={{ color: meta.color }} />
          </span>
          <span className="truncate text-[14px] font-medium text-text-primary">{view.category}</span>
        </div>
        <span className="flex-shrink-0 text-[13px] text-text-secondary">
          {formatEuro(view.spent)} / {formatEuro(view.amount)}
        </span>
      </div>

      <ProgressBar value={view.pct} color={view.fillColor} className="mt-3" label={`${view.category} budget`} />

      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[12px] font-medium" style={{ color: view.fillColor }}>{pctLabel}%</span>
        <span
          className="rounded-full px-2 py-0.5 text-[11px]"
          style={{
            backgroundColor: daysWarning ? 'var(--color-warning-muted)' : 'var(--bg-elevated)',
            color: daysWarning ? 'var(--color-warning)' : 'var(--text-muted)',
          }}
        >
          {daysChip}
        </span>
      </div>
    </button>
  )
}

/** Right-pane detail for the selected budget (tablet landscape / desktop). */
function BudgetDetail({
  view, daysLeft, onEdit, onBack,
}: { view: BudgetView; daysLeft: number; onEdit: () => void; onBack: () => void }) {
  const meta = getCategoryMeta(view.category)
  const Icon = meta.icon
  const remaining = view.amount - view.spent
  return (
    <div className="rounded-lg border border-default bg-bg-card card-pad p-5">
      {/* Back — stacked (narrow) view only; hidden when the list is beside us. */}
      <button
        onClick={onBack}
        className="md-back touch-target mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-text-secondary hover:text-text-primary"
      >
        <ChevronLeft className="h-4 w-4" /> All budgets
      </button>
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: hexToRgba(meta.color, 0.15) }}
        >
          <Icon className="h-5 w-5" style={{ color: meta.color }} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-semibold text-text-primary">{view.category}</h3>
          <p className="text-[12px] text-text-muted">
            {daysLeft === 0 ? 'Month ends today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left this month`}
          </p>
        </div>
        <button
          onClick={onEdit}
          className="touch-target inline-flex items-center gap-1.5 rounded-md border border-default px-3 text-[13px] font-medium text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      </div>

      <p className="num-hero mt-5 leading-none" style={{ color: view.fillColor, fontSize: 'clamp(30px, 6vw, 40px)' }}>
        {formatEuro(view.spent)}
      </p>
      <p className="mt-1 text-[13px] text-text-secondary">of {formatEuro(view.amount)} budgeted</p>

      <ProgressBar value={view.pct} color={view.fillColor} className="mt-4" label={`${view.category} budget`} />

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-default bg-bg-elevated p-3">
          <p className="text-[18px] font-semibold" style={{ color: remaining < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
            {formatEuro(Math.abs(remaining))}
          </p>
          <p className="mt-0.5 text-[12px] text-text-muted">{remaining < 0 ? 'Over budget' : 'Left to spend'}</p>
        </div>
        <div className="rounded-lg border border-default bg-bg-elevated p-3">
          <p className="text-[18px] font-semibold" style={{ color: view.fillColor }}>{Math.round(view.pct)}%</p>
          <p className="mt-0.5 text-[12px] text-text-muted">of budget used</p>
        </div>
      </div>
    </div>
  )
}

export function BudgetsTab() {
  const [budgets, setBudgets] = useState<Budget[]>(() => readBudgets())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [prefill, setPrefill] = useState<BudgetPrefill | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // External-keyboard affordance (iPad Magic Keyboard): Escape clears the
  // selected budget / closes the detail pane.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const now = useMemo(() => new Date(), [])
  const summary = useMemo(() => computeBudgets(budgets, now), [budgets, now])

  const hasBudgets = budgets.length > 0
  const spentColor = summary.totalSpent > summary.totalBudgeted ? '#EF4444' : '#22C55E'

  // Selection survives rotation and the split⇄stack reflow. If the selected
  // budget disappears (deleted), fall back to null so the pane clears.
  const selected = summary.views.find((v) => v.id === selectedId) ?? null

  const openNew = () => { setPrefill(null); setDrawerOpen(true) }
  const openSuggested = (s: BudgetPrefill) => { setPrefill(s); setDrawerOpen(true) }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-text-secondary">Track spending against monthly limits.</p>
        <button
          onClick={openNew}
          className="btn-accent inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-white"
          style={{ backgroundColor: 'var(--color-accent)', transition: 'var(--transition-fast)' }}
        >
          <Plus className="h-4 w-4" /> New budget
        </button>
      </div>

      {hasBudgets ? (
        <>
          {/* Summary tiles — 2/3/4-up by container width (Split-View aware). */}
          <div className="cq-metrics mb-6">
            <SummaryCard value={<AnimatedEuro value={summary.totalBudgeted} />} label="Budgeted this month" />
            <SummaryCard value={<AnimatedEuro value={summary.totalSpent} />} valueColor={spentColor} label="Spent so far" />
            <SummaryCard
              value={<AnimatedPercent value={summary.overallPct} />}
              valueColor={usageColor(summary.overallPct)}
              label={`of budget used · ${summary.daysLeft} day${summary.daysLeft === 1 ? '' : 's'} left`}
            />
          </div>

          {/* Master–detail: card grid when narrow (phone / small Split View),
              list + detail pane when the container is wide (tablet landscape /
              desktop). Selection is preserved across the reflow. */}
          <MasterDetail
            hasSelection={selected !== null}
            stackList={
              <div className="cq-cards stagger-list">
                {summary.views.map((v) => (
                  <BudgetCard key={v.id} view={v} daysLeft={summary.daysLeft}
                    onSelect={() => setSelectedId(v.id)} />
                ))}
              </div>
            }
            list={
              <div className="flex flex-col gap-2">
                {summary.views.map((v) => (
                  <BudgetCard key={v.id} view={v} daysLeft={summary.daysLeft}
                    selected={v.id === selectedId} onSelect={() => setSelectedId(v.id)} />
                ))}
              </div>
            }
            detail={
              selected ? (
                <BudgetDetail view={selected} daysLeft={summary.daysLeft} onEdit={openNew} onBack={() => setSelectedId(null)} />
              ) : (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-default bg-bg-card p-8 text-center">
                  <Target className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
                  <p className="mt-3 text-[14px] text-text-secondary">Select a budget to see its breakdown.</p>
                </div>
              )
            }
          />
        </>
      ) : (
        <div className="rounded-lg border border-default bg-bg-card p-6 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-bg-elevated">
            <Target className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
          </span>
          <h3 className="mt-3 text-[15px] font-semibold text-text-primary">No budgets yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-text-secondary">
            Start with a suggested category below, or create your own. Tap one to set the amount.
          </p>

          <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
            {BUDGET_SUGGESTIONS.map((s) => {
              const meta = getCategoryMeta(s.category)
              const Icon = meta.icon
              return (
                <button
                  key={s.category}
                  onClick={() => openSuggested(s)}
                  className="flex items-center gap-2 rounded-lg border border-default bg-bg-elevated px-3 py-2.5 text-left hover:border-strong"
                  style={{ transition: 'var(--transition-fast)' }}
                >
                  <span
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: hexToRgba(meta.color, 0.15) }}
                  >
                    <Icon className="h-4 w-4" style={{ color: meta.color }} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-text-primary">{s.category}</span>
                    <span className="block text-[11px] text-text-muted">{formatEuro(s.amount)}/mo</span>
                  </span>
                </button>
              )
            })}
          </div>

          <button
            onClick={openNew}
            className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-white"
            style={{ backgroundColor: 'var(--color-accent)', transition: 'var(--transition-fast)' }}
          >
            <Plus className="h-4 w-4" /> Create custom budget
          </button>
        </div>
      )}

      <BudgetDrawer
        open={drawerOpen}
        prefill={prefill}
        onClose={() => setDrawerOpen(false)}
        onCreated={setBudgets}
      />
    </div>
  )
}
