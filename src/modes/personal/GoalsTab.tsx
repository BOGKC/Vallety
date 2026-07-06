import { useMemo, useState } from 'react'
import { Plus, CalendarDays, Star } from 'lucide-react'
import { Modal } from '../../shared/components/Modal'
import { EmptyState } from '../../components/EmptyState'
import toast from '../../components/Toast'
import { formatEuro, parseAmount } from '../../shared/lib/formatters'
import { cn } from '../../shared/lib/cn'
import {
  readGoals, computeGoals, updateGoal, type Goal, type GoalView,
} from '../../shared/lib/goals'
import { GoalDrawer } from './GoalDrawer'

const RING = 80
const STROKE = 6
const R = (RING - STROKE) / 2
const CIRC = 2 * Math.PI * R

function milestonePoint(fraction: number) {
  const angle = (-90 + 360 * fraction) * (Math.PI / 180)
  return { x: RING / 2 + R * Math.cos(angle), y: RING / 2 + R * Math.sin(angle) }
}

function GoalCard({
  view, onEdit, onAddFunds,
}: { view: GoalView; onEdit: () => void; onAddFunds: () => void }) {
  const offset = CIRC * (1 - view.pct / 100)
  // Ring colour reflects state immediately; only the arc length animates.
  const complete = view.pct >= 100
  const ringColor = complete ? 'var(--color-success)' : 'var(--color-accent)'
  return (
    <div className="rounded-lg bg-bg-card p-5">
      {/* Ring */}
      <div className="flex justify-center">
        <div className="relative" style={{ width: RING, height: RING }}>
          <svg width={RING} height={RING}>
            <circle cx={RING / 2} cy={RING / 2} r={R} fill="none"
              stroke="var(--bg-elevated)" strokeWidth={STROKE} />
            <circle
              className="goal-ring__arc"
              cx={RING / 2} cy={RING / 2} r={R} fill="none"
              stroke={ringColor} strokeWidth={STROKE} strokeLinecap="round"
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
              strokeDasharray={CIRC}
              style={{
                ...({ '--ring-circ': `${CIRC}`, '--ring-offset': `${offset}` } as React.CSSProperties),
                strokeDashoffset: offset,
              }}
            />
            {[0.25, 0.5, 0.75].map((f) => {
              const p = milestonePoint(f)
              return <circle key={f} cx={p.x} cy={p.y} r={2.5} fill={ringColor} opacity={0.6} />
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[16px] font-bold text-text-primary">{Math.round(view.pct)}%</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <p className="mt-3 text-center text-[15px] font-semibold text-text-primary">{view.name}</p>
      <p className="mt-0.5 text-center text-[13px] text-text-secondary">
        {formatEuro(view.saved)} saved of {formatEuro(view.target)}
      </p>
      {view.targetDate && (
        <div className="mt-1.5 flex items-center justify-center gap-1 text-[12px] text-text-muted">
          <CalendarDays className="h-3 w-3" />
          by {new Date(view.targetDate).toLocaleDateString('en-IE', { month: 'long', year: 'numeric' })}
        </div>
      )}
      {view.monthlyNeeded > 0 && (
        <p className="mt-1 text-center text-[12px]" style={{ color: 'var(--color-accent)' }}>
          Save {formatEuro(view.monthlyNeeded)}/month to reach goal
        </p>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center border-t border-subtle pt-3 text-[12px] text-text-secondary">
        <button onClick={onEdit} className="flex-1 hover:text-text-primary">Edit</button>
        <span className="h-4 w-px bg-[var(--border-subtle)]" />
        <button onClick={onAddFunds} className="flex-1 hover:text-text-primary">Add funds</button>
      </div>
    </div>
  )
}

export function GoalsTab() {
  const [goals, setGoals] = useState<Goal[]>(() => readGoals())
  const [drawer, setDrawer] = useState<{ open: boolean; mode: 'add' | 'edit'; goal: Goal | null }>({
    open: false, mode: 'add', goal: null,
  })
  const [funds, setFunds] = useState<{ goal: Goal | null; amount: string }>({ goal: null, amount: '' })

  const now = useMemo(() => new Date(), [])
  const summary = useMemo(() => computeGoals(goals, now), [goals, now])
  const hasGoals = goals.length > 0

  const openAdd = () => setDrawer({ open: true, mode: 'add', goal: null })
  const openEdit = (g: Goal) => setDrawer({ open: true, mode: 'edit', goal: g })

  const applyFunds = () => {
    const amt = parseAmount(funds.amount)
    if (funds.goal && Number.isFinite(amt) && amt > 0) {
      const wasComplete = funds.goal.saved >= funds.goal.target
      const nowComplete = funds.goal.saved + amt >= funds.goal.target
      setGoals(updateGoal(funds.goal.id, { saved: funds.goal.saved + amt }))
      // Celebrate the moment a goal is first reached.
      if (!wasComplete && nowComplete) toast.success(`🎉 Goal reached — ${funds.goal.name}!`)
      else toast.success('Funds added')
    }
    setFunds({ goal: null, amount: '' })
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] text-text-secondary">
          {hasGoals
            ? `${summary.count} goal${summary.count === 1 ? '' : 's'} · Total target ${formatEuro(summary.totalTarget)}${summary.onTrackCount > 0 ? ` · On track: ${summary.onTrackCount}` : ''}`
            : 'Track progress toward what matters.'}
        </p>
        <button
          onClick={openAdd}
          className="btn-accent inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-white"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <Plus className="h-4 w-4" /> New goal
        </button>
      </div>

      {hasGoals ? (
        <div className="stagger-list grid grid-cols-1 gap-4 md:grid-cols-2">
          {summary.views.map((v) => (
            <GoalCard
              key={v.id}
              view={v}
              onEdit={() => openEdit(v)}
              onAddFunds={() => setFunds({ goal: v, amount: '' })}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Star}
          title="No savings goals"
          description="Create a goal for anything — a house, a trip, an emergency fund."
          primaryAction={{ label: 'Create a goal', icon: Plus, onClick: openAdd }}
        />
      )}

      <GoalDrawer
        open={drawer.open}
        mode={drawer.mode}
        goal={drawer.goal}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        onSaved={setGoals}
      />

      <Modal
        open={funds.goal !== null}
        onClose={() => setFunds({ goal: null, amount: '' })}
        title={`Add funds${funds.goal ? ` · ${funds.goal.name}` : ''}`}
        footer={
          <>
            <button
              onClick={() => setFunds({ goal: null, amount: '' })}
              className="inline-flex h-9 items-center rounded-md border border-default px-3 text-[13px] font-medium text-text-secondary hover:bg-bg-card hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={applyFunds}
              className={cn('inline-flex h-9 items-center rounded-md px-3 text-[13px] font-semibold text-white')}
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              Add funds
            </button>
          </>
        }
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] text-text-muted">Amount to add (€)</span>
          <input
            autoFocus
            type="number"
            min="0"
            step="0.01"
            value={funds.amount}
            onChange={(e) => setFunds((f) => ({ ...f, amount: e.target.value }))}
            className="h-10 w-full rounded-md border border-default bg-bg-input px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent"
            placeholder="0.00"
          />
        </label>
      </Modal>
    </div>
  )
}
