import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Receipt, Percent, PiggyBank, Plus, ArrowRight, Briefcase } from 'lucide-react'
import toast from '../../components/Toast'
import { Modal } from '../../shared/components/Modal'
import { EmptyState } from '../../components/EmptyState'
import { AnimatedEuro } from '../../components/AnimatedNumber'
import { formatEuro, parseAmount } from '../../shared/lib/formatters'
import { addTransaction } from '../../shared/lib/transactions'
import {
  readInvoices, readExpenses, computeBusinessSummary, invoiceGross, type Invoice,
} from '../../shared/lib/business'

function MetricCard({ icon: Icon, label, value, sub }: {
  icon: typeof FileText
  label: string
  value: React.ReactNode
  sub?: string
}) {
  return (
    <div className="card rounded-lg border border-default bg-bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
        <span className="text-[12px] text-text-muted">{label}</span>
      </div>
      <p className="mt-2 text-[22px] font-semibold leading-tight text-text-primary">{value}</p>
      {sub && <p className="mt-1 text-[12px] text-text-muted">{sub}</p>}
    </div>
  )
}

const STATUS_STYLE: Record<Invoice['status'], { bg: string; color: string; label: string }> = {
  draft: { bg: 'var(--bg-elevated)', color: 'var(--text-muted)', label: 'Draft' },
  sent: { bg: 'var(--color-warning-muted)', color: 'var(--color-warning)', label: 'Sent' },
  paid: { bg: 'var(--color-success-muted)', color: 'var(--color-success)', label: 'Paid' },
}

export function BusinessDashboard() {
  const navigate = useNavigate()
  const [invoices] = useState(() => readInvoices())
  const [expenses] = useState(() => readExpenses())
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferAmount, setTransferAmount] = useState('')

  const now = useMemo(() => new Date(), [])
  const s = useMemo(() => computeBusinessSummary(invoices, expenses, now), [invoices, expenses, now])

  const hasData = invoices.length > 0 || expenses.length > 0
  const safeColor = s.safeToPay > 0 ? '#22C55E' : s.safeToPay < 0 ? '#EF4444' : 'var(--text-muted)'

  // The bridge between modes: paying yourself creates PERSONAL income, so the
  // business take-home flows straight into the personal budget picture.
  const doTransfer = () => {
    const amt = parseAmount(transferAmount)
    if (!Number.isFinite(amt) || amt <= 0) { toast.error('Enter a valid amount.'); return }
    addTransaction({
      type: 'income',
      amount: amt,
      merchant: "Owner's draw",
      category: 'Income',
      date: new Date().toISOString(),
      notes: 'Transferred from business (safe-to-pay-yourself)',
      account: 'Business',
    })
    setTransferOpen(false)
    setTransferAmount('')
    toast.success(`${formatEuro(amt)} recorded as personal income 🎉`)
  }

  const recent = [...invoices]
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
    .slice(0, 5)

  if (!hasData) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="sr-only">Business dashboard</h1>
        <div className="rounded-lg bg-bg-card">
          <EmptyState
            icon={Briefcase}
            title="Welcome to Solo founder mode"
            description="Create your first invoice or log a business expense, and Vallety will track your VAT, estimate your taxes, and tell you what you can safely pay yourself."
            primaryAction={{ label: 'Create an invoice', icon: Plus, onClick: () => navigate('/business/invoices') }}
            secondaryAction={{ label: 'Log an expense', onClick: () => navigate('/business/expenses') }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:gap-6">
      <h1 className="sr-only">Business dashboard</h1>

      {/* Hero — the killer number */}
      <div className="relative">
        <div className="hero-glow" aria-hidden />
        <div className="relative rounded-lg bg-bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 text-center sm:text-left">
              <p className="text-[12px] font-medium uppercase text-text-muted" style={{ letterSpacing: '0.08em' }}>
                Safe to pay yourself
              </p>
              <p className="num-hero mt-1 leading-none" style={{ color: safeColor, fontSize: 'clamp(32px, 8vw, 52px)' }}>
                <AnimatedEuro value={s.safeToPay} />
              </p>
              <p className="mt-2 text-[13px] text-text-secondary">
                This month's revenue minus ALV, estimated tax, YEL, and expenses
              </p>
            </div>
            <button
              onClick={() => { setTransferAmount(s.safeToPay > 0 ? String(Math.floor(s.safeToPay)) : ''); setTransferOpen(true) }}
              className="btn-accent inline-flex h-10 flex-shrink-0 items-center gap-1.5 self-center rounded-md px-4 text-[13px] font-semibold text-white sm:self-auto"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              Transfer to personal <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-4 border-t border-subtle pt-3 text-[11px] text-text-muted">
            Estimates only — VAT, advance tax and YEL figures are approximations, not official
            calculations. Confirm with your accountant or Vero.
          </p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="stagger-list grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard icon={FileText} label="Invoiced this month" value={<AnimatedEuro value={s.revenueMonth} />} sub="paid, net of VAT" />
        <MetricCard
          icon={FileText}
          label="Outstanding"
          value={<AnimatedEuro value={s.outstanding} />}
          sub={s.outstandingCount > 0 ? `${s.outstandingCount} unpaid invoice${s.outstandingCount === 1 ? '' : 's'}` : 'nothing unpaid'}
        />
        <MetricCard icon={Percent} label="ALV owed to Vero" value={<AnimatedEuro value={s.vatOwed} />} sub="year to date" />
        <MetricCard icon={PiggyBank} label="Tax to set aside" value={<AnimatedEuro value={s.advanceTaxYtd} />} sub="est. advance tax, YTD" />
      </div>

      {/* Recent invoices */}
      <div className="rounded-lg bg-bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-text-primary">Recent invoices</h2>
          <button
            onClick={() => navigate('/business/invoices')}
            className="text-[12px] text-text-muted hover:text-text-primary"
          >
            View all →
          </button>
        </div>
        <div className="stagger-list flex flex-col divide-y divide-[rgba(255,255,255,0.05)]">
          {recent.map((inv) => {
            const st = STATUS_STYLE[inv.status]
            return (
              <div key={inv.id} className="flex items-center gap-3 py-2.5">
                <Receipt className="h-4 w-4 flex-shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-text-primary">{inv.client}</p>
                  <p className="truncate text-[12px] text-text-muted">{inv.description}</p>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: st.bg, color: st.color }}>
                  {st.label}
                </span>
                <span className="text-[14px] font-semibold text-text-primary">{formatEuro(invoiceGross(inv))}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Transfer modal */}
      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Pay yourself"
        footer={
          <>
            <button onClick={() => setTransferOpen(false)} className="inline-flex h-9 items-center rounded-md border border-default px-3 text-[13px] font-medium text-text-secondary hover:text-text-primary">
              Cancel
            </button>
            <button onClick={doTransfer} className="btn-accent inline-flex h-9 items-center rounded-md px-3 text-[13px] font-semibold text-white" style={{ backgroundColor: 'var(--color-accent)' }}>
              Record transfer
            </button>
          </>
        }
      >
        <p className="mb-3">
          Records an owner's draw as <span className="text-text-primary">personal income</span>, so your
          take-home flows into your personal budget and safe-to-spend.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] text-text-muted">Amount (€)</span>
          <input
            autoFocus
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="h-10 w-full rounded-md border border-default bg-bg-input px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent"
          />
        </label>
      </Modal>
    </div>
  )
}
