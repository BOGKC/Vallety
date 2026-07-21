import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, RefreshCw, MoreVertical, Pencil, EyeOff, Eye, XCircle, Trash2, Bell,
} from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'
import toast from '../../components/Toast'
import { formatEuro } from '../../shared/lib/formatters'
import { AnimatedEuro } from '../../components/AnimatedNumber'
import { cn } from '../../shared/lib/cn'
import { readTransactions } from '../../shared/lib/transactions'
import { detectSubscriptions, normalizeMerchant } from '../../shared/lib/detectSubscriptions'
import {
  readManualSubs, deleteManualSub, updateManualSub, readOverrides, setOverride,
  monthlyEquivalent, merchantColor, merchantInitial,
  type ManualSub, type OverrideMap, type SubStatus, type SubFrequency,
} from '../../shared/lib/subscriptions'
import { SubscriptionDrawer, type SubPrefill } from './SubscriptionDrawer'

type Tab = 'active' | 'to_cancel' | 'hidden'

interface SubView {
  key: string
  source: 'manual' | 'detected'
  manualId?: string
  merchantKey?: string
  merchant: string
  amount: number
  frequency: SubFrequency // 'monthly' | 'yearly'
  monthly: number
  lastCharged: string
  status: SubStatus
  reminderDate?: string
  priceChanged: boolean
}

function freqSuffix(f: SubFrequency): string {
  return f === 'yearly' ? '/year' : '/month'
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })
}

// ── Row menu ──────────────────────────────────────────────────────────────────

function RowMenu({ items }: { items: { label: string; icon: React.ReactNode; danger?: boolean; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])
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
        <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-md border border-default bg-bg-elevated py-1 shadow-lg" role="menu">
          {items.map((it) => (
            <button
              key={it.label}
              onClick={() => { setOpen(false); it.onClick() }}
              className="flex w-full items-center gap-2 px-3 py-2 text-[13px] hover:bg-bg-card"
              style={{ color: it.danger ? 'var(--color-danger)' : 'var(--text-secondary)' }}
            >
              {it.icon} {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Subscription card ─────────────────────────────────────────────────────────

function SubCard({
  view, variant, reminderEditing, onMenu, onSetReminderClick, onSaveReminder,
  onCancelled, children,
}: {
  view: SubView
  variant: Tab
  reminderEditing: boolean
  onMenu: { label: string; icon: React.ReactNode; danger?: boolean; onClick: () => void }[]
  onSetReminderClick: () => void
  onSaveReminder: (date: string) => void
  onCancelled: () => void
  children?: React.ReactNode
}) {
  const dimmed = variant === 'hidden'
  const struck = variant === 'to_cancel'
  return (
    <div className={cn('rounded-lg bg-bg-card px-4 py-3.5', dimmed && 'opacity-60')}>
      <div className="flex items-center gap-3">
        <span
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
          style={{ backgroundColor: merchantColor(view.merchant) }}
        >
          {merchantInitial(view.merchant)}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-[14px] font-medium text-text-primary', struck && 'line-through')}>
            {view.merchant}
          </p>
          <span className="text-[13px] text-text-secondary">
            {formatEuro(view.amount)}{freqSuffix(view.frequency)}
          </span>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {variant === 'active' && view.priceChanged && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: 'var(--color-warning-muted)', color: 'var(--color-warning)' }}
            >
              ↑ Price increased
            </span>
          )}
          {struck && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: 'var(--color-warning-muted)', color: 'var(--color-warning)' }}
            >
              Cancellation pending
            </span>
          )}
          {variant === 'active' && (
            <span className="hidden text-[12px] text-text-muted sm:inline">{fmtDate(view.lastCharged)}</span>
          )}
          {children}
          {onMenu.length > 0 && <RowMenu items={onMenu} />}
        </div>
      </div>

      {/* To-cancel controls */}
      {variant === 'to_cancel' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-subtle pt-3">
          {reminderEditing ? (
            <input
              type="date"
              autoFocus
              onChange={(e) => onSaveReminder(e.target.value)}
              className="h-8 rounded-md border border-default bg-bg-input px-2 text-[12px] text-text-primary focus:border-accent"
            />
          ) : (
            <button
              onClick={onSetReminderClick}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-default px-2.5 text-[12px] text-text-secondary hover:text-text-primary"
            >
              <Bell className="h-3.5 w-3.5" />
              {view.reminderDate ? `Reminder ${fmtDate(view.reminderDate)}` : 'Set reminder'}
            </button>
          )}
          <button
            onClick={onCancelled}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-white"
            style={{ backgroundColor: 'var(--color-success)' }}
          >
            <XCircle className="h-3.5 w-3.5" /> I cancelled it
          </button>
        </div>
      )}
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export function SubscriptionsPage() {
  const navigate = useNavigate()
  const [manualSubs, setManualSubs] = useState<ManualSub[]>(() => readManualSubs())
  const [overrides, setOverrides] = useState<OverrideMap>(() => readOverrides())
  const [tab, setTab] = useState<Tab>('active')
  const [drawer, setDrawer] = useState<{ open: boolean; mode: 'add' | 'edit'; sub: ManualSub | null; prefill: SubPrefill | null }>({
    open: false, mode: 'add', sub: null, prefill: null,
  })
  const [dismissAfterSave, setDismissAfterSave] = useState<string | null>(null)
  const [reminderEditKey, setReminderEditKey] = useState<string | null>(null)

  const transactions = useMemo(() => readTransactions(), [])
  const detected = useMemo(() => detectSubscriptions(transactions), [transactions])

  // Build the unified list of subscription views.
  const views = useMemo<SubView[]>(() => {
    const manualKeys = new Set(manualSubs.map((s) => normalizeMerchant(s.merchant)))
    const out: SubView[] = manualSubs.map((s) => ({
      key: `man:${s.id}`,
      source: 'manual',
      manualId: s.id,
      merchant: s.merchant,
      amount: s.amount,
      frequency: s.frequency,
      monthly: monthlyEquivalent(s.amount, s.frequency),
      lastCharged: s.lastCharged,
      status: s.status,
      reminderDate: s.reminderDate,
      priceChanged: false,
    }))
    for (const d of detected) {
      if (manualKeys.has(d.merchantKey)) continue
      const ov = overrides[d.merchantKey]
      if (ov?.dismissed) continue
      const frequency: SubFrequency = d.frequency === 'annual' ? 'yearly' : 'monthly'
      out.push({
        key: `det:${d.merchantKey}`,
        source: 'detected',
        merchantKey: d.merchantKey,
        merchant: d.merchant,
        amount: d.amount,
        frequency,
        monthly: d.estimatedMonthlyAmount,
        lastCharged: d.lastCharged,
        status: ov?.status ?? 'active',
        reminderDate: ov?.reminderDate,
        priceChanged: d.priceChanged,
      })
    }
    return out
  }, [manualSubs, detected, overrides])

  const active = views.filter((v) => v.status === 'active')
  const toCancel = views.filter((v) => v.status === 'to_cancel')
  const hidden = views.filter((v) => v.status === 'hidden')
  const activeDetected = active.filter((v) => v.source === 'detected')
  const activeManual = active.filter((v) => v.source === 'manual')

  const monthlyTotal = active.reduce((a, v) => a + v.monthly, 0)

  // ── Mutations ──
  const applyStatus = (v: SubView, status: SubStatus) => {
    if (v.source === 'manual' && v.manualId) setManualSubs(updateManualSub(v.manualId, { status }))
    else if (v.merchantKey) setOverrides(setOverride(v.merchantKey, { status }))
  }
  const setReminder = (v: SubView, date: string) => {
    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) { setReminderEditKey(null); return }
    const iso = parsed.toISOString()
    if (v.source === 'manual' && v.manualId) setManualSubs(updateManualSub(v.manualId, { reminderDate: iso }))
    else if (v.merchantKey) setOverrides(setOverride(v.merchantKey, { reminderDate: iso }))
    setReminderEditKey(null)
  }
  const removeSub = (v: SubView) => {
    if (v.source === 'manual' && v.manualId) setManualSubs(deleteManualSub(v.manualId))
    else if (v.merchantKey) setOverrides(setOverride(v.merchantKey, { dismissed: true }))
  }
  const confirmDelete = (v: SubView) => {
    if (window.confirm(`Delete ${v.merchant}?`)) removeSub(v)
  }
  const cancelledIt = (v: SubView) => {
    removeSub(v)
    toast.success(`${formatEuro(v.monthly)}/month saved! 🎉`)
  }
  const openEdit = (v: SubView) => {
    if (v.source === 'manual') {
      const sub = manualSubs.find((s) => s.id === v.manualId) ?? null
      setDrawer({ open: true, mode: 'edit', sub, prefill: null })
    } else {
      // Convert a detected subscription into a manual one on save.
      setDismissAfterSave(v.merchantKey ?? null)
      setDrawer({
        open: true, mode: 'add', sub: null,
        prefill: { merchant: v.merchant, amount: v.amount, frequency: v.frequency, lastCharged: v.lastCharged },
      })
    }
  }
  const handleDrawerSaved = (subs: ManualSub[]) => {
    setManualSubs(subs)
    if (dismissAfterSave) {
      setOverrides(setOverride(dismissAfterSave, { dismissed: true }))
      setDismissAfterSave(null)
    }
  }

  const activeMenu = (v: SubView) => [
    { label: 'Mark for cancellation', icon: <XCircle className="h-3.5 w-3.5" />, onClick: () => applyStatus(v, 'to_cancel') },
    { label: 'Hide', icon: <EyeOff className="h-3.5 w-3.5" />, onClick: () => applyStatus(v, 'hidden') },
    { label: 'Edit', icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => openEdit(v) },
    { label: 'Delete', icon: <Trash2 className="h-3.5 w-3.5" />, danger: true, onClick: () => confirmDelete(v) },
  ]

  const noSubsAtAll = views.length === 0

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: 'active', label: 'Active', count: active.length },
    { value: 'to_cancel', label: 'To cancel', count: toCancel.length },
    { value: 'hidden', label: 'Hidden', count: hidden.length },
  ]

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-[18px] font-semibold text-text-primary">Subscriptions</h1>
        <button
          onClick={() => setDrawer({ open: true, mode: 'add', sub: null, prefill: null })}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-default px-3 text-[13px] font-medium text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
        >
          <Plus className="h-4 w-4" /> Add manually
        </button>
      </div>

      {/* Total banner — hidden until there's at least one subscription, so a
          brand-new user sees the friendly empty state instead of "€0.00/month". */}
      {!noSubsAtAll && (
        <div className="mb-5 rounded-lg border border-default bg-bg-card p-5">
          <p className="text-[28px] font-bold text-text-primary"><AnimatedEuro value={monthlyTotal} />/month</p>
          {active.length > 0 && (
            <p className="mt-0.5 text-[14px] text-text-secondary">
              across {active.length} active subscription{active.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
      )}

      {/* Tabs */}
      {!noSubsAtAll && (
      <div className="mb-5 inline-flex items-center gap-1 rounded-full bg-bg-elevated p-1">
        {tabs.map((t) => {
          const isActive = tab === t.value
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'h-9 rounded-full px-4 text-[13px] font-medium',
                isActive ? 'text-white' : 'text-text-muted hover:text-text-secondary'
              )}
              style={isActive ? { backgroundColor: 'var(--color-accent)' } : undefined}
            >
              {t.label}{t.count > 0 ? ` (${t.count})` : ''}
            </button>
          )
        })}
      </div>
      )}

      {/* ACTIVE */}
      {tab === 'active' && (
        active.length > 0 ? (
          <div className="flex flex-col gap-5">
            {activeDetected.length > 0 && (
              <div>
                <p className="mb-1 text-[13px] font-medium text-text-primary">Auto-detected</p>
                <p className="mb-2 text-[12px] italic text-text-muted">Detected from your transaction history</p>
                <div className="stagger-list flex flex-col gap-3">
                  {activeDetected.map((v) => (
                    <SubCard
                      key={v.key} view={v} variant="active" reminderEditing={false}
                      onMenu={activeMenu(v)} onSetReminderClick={() => {}}
                      onSaveReminder={() => {}} onCancelled={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}
            {activeManual.length > 0 && (
              <div>
                <p className="mb-2 text-[13px] font-medium text-text-primary">Manual</p>
                <div className="stagger-list flex flex-col gap-3">
                  {activeManual.map((v) => (
                    <SubCard
                      key={v.key} view={v} variant="active" reminderEditing={false}
                      onMenu={activeMenu(v)} onSetReminderClick={() => {}}
                      onSaveReminder={() => {}} onCancelled={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : noSubsAtAll && transactions.length === 0 ? (
          // No data at all yet.
          <EmptyState
            icon={RefreshCw}
            title="No subscriptions detected"
            description="Add a few months of transactions manually and we'll automatically detect your recurring subscriptions."
            primaryAction={{ label: 'Add transaction', icon: Plus, onClick: () => navigate('/transactions') }}
          />
        ) : noSubsAtAll ? (
          // Transactions exist, but nothing recurring was detected.
          <EmptyState
            icon={RefreshCw}
            title="No recurring charges found"
            description="We didn't spot any subscriptions in your transactions yet. Add one manually, or keep importing transactions and we'll detect them automatically."
            primaryAction={{ label: 'Add manually', icon: Plus, onClick: () => setDrawer({ open: true, mode: 'add', sub: null, prefill: null }) }}
          />
        ) : (
          // Subscriptions exist, but none are currently active.
          <p className="py-6 text-center text-[13px] text-text-muted">No active subscriptions.</p>
        )
      )}

      {/* TO CANCEL */}
      {tab === 'to_cancel' && (
        toCancel.length > 0 ? (
          <div className="stagger-list flex flex-col gap-3">
            {toCancel.map((v) => (
              <SubCard
                key={v.key} view={v} variant="to_cancel"
                reminderEditing={reminderEditKey === v.key}
                onMenu={[]}
                onSetReminderClick={() => setReminderEditKey(v.key)}
                onSaveReminder={(date) => setReminder(v, date)}
                onCancelled={() => cancelledIt(v)}
              />
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-[13px] text-text-muted">Nothing marked for cancellation.</p>
        )
      )}

      {/* HIDDEN */}
      {tab === 'hidden' && (
        hidden.length > 0 ? (
          <div className="stagger-list flex flex-col gap-3">
            {hidden.map((v) => (
              <SubCard
                key={v.key} view={v} variant="hidden" reminderEditing={false}
                onMenu={[]} onSetReminderClick={() => {}} onSaveReminder={() => {}} onCancelled={() => {}}
              >
                <button
                  onClick={() => applyStatus(v, 'active')}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-default px-2.5 text-[12px] text-text-secondary hover:text-text-primary"
                >
                  <Eye className="h-3.5 w-3.5" /> Unhide
                </button>
              </SubCard>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-[13px] text-text-muted">No hidden subscriptions.</p>
        )
      )}

      <SubscriptionDrawer
        open={drawer.open}
        mode={drawer.mode}
        sub={drawer.sub}
        prefill={drawer.prefill}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        onSaved={handleDrawerSaved}
      />
    </div>
  )
}
