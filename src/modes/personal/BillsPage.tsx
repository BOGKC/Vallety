import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus, CalendarDays, CheckCircle, MoreVertical, Pencil, Pause, Play, Trash2,
} from 'lucide-react'
import toast from '../../components/Toast'
import { formatEuro } from '../../shared/lib/formatters'
import { getCategoryMeta, hexToRgba } from '../../shared/lib/transactions'
import { cn } from '../../shared/lib/cn'
import {
  readBills, computeSummary, timelineGroups, paidThisMonth, activeRecurring,
  markBillPaid, updateBill, deleteBill, daysUntilDue, FREQUENCY_LABELS,
  type Bill,
} from '../../shared/lib/bills'
import { BillDrawer } from './BillDrawer'
import { EmptyState } from '../../components/EmptyState'
import { AnimatedEuro } from '../../components/AnimatedNumber'

function dueLabel(bill: Bill, now: Date): { text: string; color: string; bold: boolean } {
  const d = daysUntilDue(bill, now)
  if (d <= 0) return { text: 'Due today', color: 'var(--color-danger)', bold: true }
  if (d <= 3) return { text: `Due in ${d} day${d === 1 ? '' : 's'}`, color: 'var(--color-warning)', bold: false }
  return {
    text: `Due ${new Date(bill.nextDue).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}`,
    color: 'var(--text-secondary)',
    bold: false,
  }
}

// ── Row menu ──────────────────────────────────────────────────────────────────

function RowMenu({
  bill, onEdit, onTogglePause, onDelete,
}: { bill: Bill; onEdit: () => void; onTogglePause: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const item = 'flex w-full items-center gap-2 px-3 py-2 text-[13px] text-text-secondary hover:bg-bg-card hover:text-text-primary'
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-primary"
        aria-label="More options"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-md border border-default bg-bg-elevated py-1 shadow-lg" role="menu">
          <button className={item} onClick={() => { setOpen(false); onEdit() }}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button className={item} onClick={() => { setOpen(false); onTogglePause() }}>
            {bill.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {bill.paused ? 'Resume' : 'Pause'}
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] hover:bg-[var(--color-danger-muted)]"
            style={{ color: 'var(--color-danger)' }}
            onClick={() => { setOpen(false); onDelete() }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ── Bill card ─────────────────────────────────────────────────────────────────

function BillCard({
  bill, now, variant, onMarkPaid, onEdit, onTogglePause, onDelete,
}: {
  bill: Bill
  now: Date
  variant: 'timeline' | 'recurring' | 'paid'
  onMarkPaid: () => void
  onEdit: () => void
  onTogglePause: () => void
  onDelete: () => void
}) {
  const meta = getCategoryMeta(bill.category)
  const Icon = meta.icon
  const due = dueLabel(bill, now)
  const paid = variant === 'paid'

  return (
    <div className={cn('flex items-center gap-3 rounded-lg bg-bg-card px-4 py-3.5', paid && 'paid-pop')}>
      {/* Left */}
      <span
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: hexToRgba(meta.color, 0.15) }}
      >
        <Icon className="h-4 w-4" style={{ color: meta.color }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-[14px] font-medium text-text-primary', paid && 'line-through opacity-60')}>
          {bill.name}
        </p>
        <span className="mt-0.5 inline-block rounded-full bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-muted">
          {FREQUENCY_LABELS[bill.frequency]}
        </span>
      </div>

      {/* Center: due / next */}
      <div className="hidden flex-shrink-0 px-2 text-center sm:block">
        {variant === 'timeline' ? (
          <span className="text-[12px]" style={{ color: due.color, fontWeight: due.bold ? 700 : 400 }}>
            {due.text}
          </span>
        ) : variant === 'recurring' ? (
          <span className="text-[12px] text-text-muted">
            Next due {new Date(bill.nextDue).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
          </span>
        ) : (
          <span className="text-[12px] text-text-muted">Paid this month</span>
        )}
      </div>

      {/* Right */}
      <div className="flex flex-shrink-0 items-center gap-2">
        <span className={cn('text-[15px] font-semibold text-text-primary', paid && 'line-through opacity-60')}>
          {formatEuro(bill.amount)}
        </span>
        {!paid && (
          <button
            onClick={onMarkPaid}
            className="flex items-center gap-1 text-[12px] text-text-muted hover:text-[var(--color-success)]"
            style={{ transition: 'var(--transition-fast)' }}
            aria-label="Mark paid"
          >
            <CheckCircle className="h-4 w-4" />
            <span className="hidden md:inline">Mark paid</span>
          </button>
        )}
        {paid && <CheckCircle className="h-5 w-5" style={{ color: 'var(--color-success)' }} />}
        <RowMenu bill={bill} onEdit={onEdit} onTogglePause={onTogglePause} onDelete={onDelete} />
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 mt-5 text-[12px] font-medium uppercase tracking-wide text-text-muted">{children}</p>
}

// ── Page ────────────────────────────────────────────────────────────────────

export function BillsPage() {
  const [bills, setBills] = useState<Bill[]>(() => readBills())
  const [drawer, setDrawer] = useState<{ open: boolean; mode: 'add' | 'edit'; bill: Bill | null }>({
    open: false, mode: 'add', bill: null,
  })

  const now = useMemo(() => new Date(), [])

  const summary = useMemo(() => computeSummary(bills, now), [bills, now])
  const groups = useMemo(() => timelineGroups(bills, now), [bills, now])
  const paid = useMemo(() => paidThisMonth(bills, now), [bills, now])
  const recurring = useMemo(() => activeRecurring(bills), [bills])

  const hasBills = bills.length > 0
  const hasTimeline = groups.thisWeek.length + groups.nextWeek.length + groups.laterThisMonth.length > 0

  const openAdd = () => setDrawer({ open: true, mode: 'add', bill: null })
  const openEdit = (b: Bill) => setDrawer({ open: true, mode: 'edit', bill: b })

  const handleMarkPaid = (b: Bill) => {
    setBills(markBillPaid(b.id, now))
    toast.success('Bill marked as paid')
  }
  const handleTogglePause = (b: Bill) => setBills(updateBill(b.id, { paused: !b.paused }))
  const handleDelete = (b: Bill) => { setBills(deleteBill(b.id)); toast.success('Bill deleted') }

  const cardProps = (b: Bill) => ({
    bill: b, now,
    onMarkPaid: () => handleMarkPaid(b),
    onEdit: () => openEdit(b),
    onTogglePause: () => handleTogglePause(b),
    onDelete: () => handleDelete(b),
  })

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[18px] font-semibold text-text-primary">Bills &amp; schedules</h1>
        <button
          onClick={openAdd}
          className="btn-accent inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-white"
          style={{ backgroundColor: 'var(--color-accent)', transition: 'var(--transition-fast)' }}
        >
          <Plus className="h-4 w-4" /> New bill
        </button>
      </div>

      {hasBills ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[20px] font-semibold text-text-primary"><AnimatedEuro value={summary.monthlyRecurring} /></p>
              <p className="mt-0.5 text-[12px] text-text-muted">Monthly recurring</p>
            </div>
            <div className="rounded-lg border border-default bg-bg-card p-4">
              <p
                className="text-[20px] font-semibold"
                style={{ color: summary.dueThisWeekCount > 0 ? 'var(--color-warning)' : 'var(--text-primary)' }}
              >
                {summary.dueThisWeekCount} · {formatEuro(summary.dueThisWeekTotal)}
              </p>
              <p className="mt-0.5 text-[12px] text-text-muted">Due this week</p>
            </div>
            <div className="rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[20px] font-semibold text-text-primary"><AnimatedEuro value={summary.annualTotal} /></p>
              <p className="mt-0.5 text-[12px] text-text-muted">Annual total</p>
            </div>
          </div>

          {/* Trials counter — only when there are active trials (bug 2) */}
          {summary.activeTrials > 0 && (
            <p className="mt-3 inline-block rounded-full bg-bg-elevated px-2.5 py-1 text-[12px] text-text-muted">
              {summary.activeTrials} active trial{summary.activeTrials === 1 ? '' : 's'}
            </p>
          )}

          {/* Timeline */}
          <p className="mb-1 mt-6 text-[14px] font-medium text-text-primary">Upcoming 30 days</p>
          {hasTimeline ? (
            <>
              {groups.thisWeek.length > 0 && <SectionLabel>This week</SectionLabel>}
              <div className="stagger-list flex flex-col gap-3">
                {groups.thisWeek.map((b) => <BillCard key={b.id} variant="timeline" {...cardProps(b)} />)}
              </div>
              {groups.nextWeek.length > 0 && <SectionLabel>Next week</SectionLabel>}
              <div className="stagger-list flex flex-col gap-3">
                {groups.nextWeek.map((b) => <BillCard key={b.id} variant="timeline" {...cardProps(b)} />)}
              </div>
              {groups.laterThisMonth.length > 0 && <SectionLabel>Later this month</SectionLabel>}
              <div className="stagger-list flex flex-col gap-3">
                {groups.laterThisMonth.map((b) => <BillCard key={b.id} variant="timeline" {...cardProps(b)} />)}
              </div>
            </>
          ) : (
            <p className="py-4 text-[13px] text-text-muted">Nothing due in the next 30 days.</p>
          )}

          {/* Paid this month */}
          {paid.length > 0 && (
            <>
              <SectionLabel>Paid this month</SectionLabel>
              <div className="stagger-list flex flex-col gap-3">
                {paid.map((b) => <BillCard key={b.id} variant="paid" {...cardProps(b)} />)}
              </div>
            </>
          )}

          {/* All recurring */}
          <p className="mb-1 mt-7 text-[14px] font-medium text-text-primary">All recurring bills</p>
          <div className="stagger-list flex flex-col gap-3">
            {recurring.map((b) => <BillCard key={b.id} variant="recurring" {...cardProps(b)} />)}
          </div>
        </>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="No bills scheduled"
          description="Add recurring bills and we'll remind you 3 days before each one is due."
          primaryAction={{ label: 'Add your first bill', icon: Plus, onClick: openAdd }}
        />
      )}

      <BillDrawer
        open={drawer.open}
        mode={drawer.mode}
        bill={drawer.bill}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        onSaved={setBills}
      />
    </div>
  )
}
