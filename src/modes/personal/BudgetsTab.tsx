import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { formatEuro } from '../../shared/lib/formatters'
import { getCategoryMeta, hexToRgba } from '../../shared/lib/transactions'
import {
  readBudgets, computeBudgets, usageColor, BUDGET_SUGGESTIONS,
  type Budget, type BudgetView,
} from '../../shared/lib/budgets'
import { BudgetDrawer, type BudgetPrefill } from './BudgetDrawer'

function SummaryCard({
  value, valueColor, label,
}: { value: string; valueColor?: string; label: string }) {
  return (
    <div className="rounded-lg border border-default bg-bg-card p-4">
      <p className="text-[20px] font-semibold" style={{ color: valueColor ?? 'var(--text-primary)' }}>
        {value}
      </p>
      <p className="mt-0.5 text-[12px] text-text-muted">{label}</p>
    </div>
  )
}

function BudgetCard({ view, daysLeft }: { view: BudgetView; daysLeft: number }) {
  const meta = getCategoryMeta(view.category)
  const Icon = meta.icon
  const barWidth = Math.min(100, Math.round(view.pct))
  const pctLabel = Math.round(view.pct)

  const daysChip =
    daysLeft === 0 ? 'Month ends today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
  const daysWarning = daysLeft <= 7

  return (
    <div className="rounded-lg border border-default bg-bg-card p-4 transition-transform duration-150 hover:scale-[1.01] hover:bg-bg-elevated">
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

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
        <div
          className="budget-fill h-1.5 rounded-full"
          style={{
            ...({ '--target-w': `${barWidth}%` } as React.CSSProperties),
            width: `${barWidth}%`,
            backgroundColor: view.fillColor,
          }}
        />
      </div>

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
    </div>
  )
}

function QuickStart({ onPick }: { onPick: (p: BudgetPrefill) => void }) {
  return (
    <div>
      <p className="mb-3 text-[14px] font-medium text-text-secondary">
        Get started with common budgets
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {BUDGET_SUGGESTIONS.map((s) => {
          const meta = getCategoryMeta(s.category)
          const Icon = meta.icon
          return (
            <div
              key={s.category}
              className="flex flex-col items-center gap-2 rounded-lg p-4 text-center"
              style={{ border: '1px dashed var(--border-default)' }}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: hexToRgba(meta.color, 0.15) }}
              >
                <Icon className="h-4 w-4" style={{ color: meta.color }} />
              </span>
              <span className="text-[13px] font-medium text-text-primary">{s.category}</span>
              <span className="text-[11px] text-text-muted">{formatEuro(s.amount)} / month suggested</span>
              <button
                onClick={() => onPick({ category: s.category, amount: s.amount })}
                className="mt-1 text-[12px] font-medium"
                style={{ color: 'var(--color-accent)' }}
              >
                + Create
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function BudgetsTab() {
  const [budgets, setBudgets] = useState<Budget[]>(() => readBudgets())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [prefill, setPrefill] = useState<BudgetPrefill | null>(null)

  const now = useMemo(() => new Date(), [])
  const summary = useMemo(() => computeBudgets(budgets, now), [budgets, now])

  const hasBudgets = budgets.length > 0
  const spentColor = summary.totalSpent > summary.totalBudgeted ? '#EF4444' : '#22C55E'

  const openNew = () => { setPrefill(null); setDrawerOpen(true) }
  const openPrefilled = (p: BudgetPrefill) => { setPrefill(p); setDrawerOpen(true) }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-text-secondary">Track spending against monthly limits.</p>
        <button
          onClick={openNew}
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-white"
          style={{ backgroundColor: 'var(--color-accent)', transition: 'var(--transition-fast)' }}
        >
          <Plus className="h-4 w-4" /> New budget
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard value={formatEuro(summary.totalBudgeted)} label="Budgeted this month" />
        <SummaryCard
          value={formatEuro(summary.totalSpent)}
          valueColor={hasBudgets ? spentColor : undefined}
          label="Spent so far"
        />
        <SummaryCard
          value={`${Math.round(summary.overallPct)}%`}
          valueColor={hasBudgets ? usageColor(summary.overallPct) : undefined}
          label={`of budget used · ${summary.daysLeft} day${summary.daysLeft === 1 ? '' : 's'} left`}
        />
      </div>

      {hasBudgets ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {summary.views.map((v) => (
            <BudgetCard key={v.id} view={v} daysLeft={summary.daysLeft} />
          ))}
        </div>
      ) : (
        <QuickStart onPick={openPrefilled} />
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
