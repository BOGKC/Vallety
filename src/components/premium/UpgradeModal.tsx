import { useEffect, useState } from 'react'
import { Check, X, ChevronLeft, ChevronDown, Shield, RotateCcw, Ban } from 'lucide-react'
import toast from '../Toast'
import { usePlan } from '../../shared/hooks/usePlan'
import {
  TIERS, COMPARISON_ROWS, priceFor, tierRank, tierDef, hasFeature, FEATURE_LABELS,
  type Tier, type BillingPeriod, type FeatureKey,
} from '../../shared/lib/plans'
import { upgradeToPlan, startTrial, priceSummary } from '../../shared/lib/billing'

// Features listed on each tier card (in order).
const CARD_FEATURES: FeatureKey[] = [
  'csv_import', 'bank_sync', 'ai_advisor', 'household',
  'business_mode', 'investment_mode', 'accountant_export', 'unlimited_ai',
]

// ── Billing period toggle ───────────────────────────────────────────────────────

function PeriodToggle({ value, onChange }: { value: BillingPeriod; onChange: (p: BillingPeriod) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-bg-elevated p-1">
      {(['monthly', 'annual'] as const).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="h-8 rounded-full px-3.5 text-[13px] font-medium"
          style={{
            backgroundColor: value === p ? 'var(--color-accent)' : 'transparent',
            color: value === p ? '#fff' : 'var(--text-muted)',
            transition: 'var(--transition-fast)',
          }}
        >
          {p === 'monthly' ? 'Monthly' : 'Annual'}
          {p === 'annual' && (
            <span className="ml-1.5 text-[11px]" style={{ color: value === p ? '#fff' : 'var(--color-success)' }}>
              save 2 months
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Tier card ─────────────────────────────────────────────────────────────────

function TierCard({
  tier, period, current, onChoose,
}: {
  tier: Tier
  period: BillingPeriod
  current: Tier
  onChoose: (t: Tier) => void
}) {
  const def = tierDef(tier)
  const per = priceFor(tier, period)
  const isCurrent = tier === current
  const cmp = tierRank(tier) - tierRank(current)
  const label = isCurrent ? 'Current' : cmp > 0 ? 'Upgrade' : 'Downgrade'

  return (
    <div
      className="relative flex flex-col rounded-xl border p-4"
      style={{
        borderColor: def.recommended ? 'var(--color-accent)' : 'var(--border-default)',
        backgroundColor: 'var(--bg-card)',
        boxShadow: def.recommended ? '0 0 0 1px var(--color-accent), 0 8px 30px color-mix(in srgb, var(--color-accent) 18%, transparent)' : undefined,
      }}
    >
      {def.recommended && (
        <span
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase text-white"
          style={{ backgroundImage: 'linear-gradient(135deg, var(--accent-500), var(--accent-600))', letterSpacing: '0.04em' }}
        >
          Most popular
        </span>
      )}
      <p className="text-[15px] font-semibold text-text-primary">{def.name}</p>
      <p className="mt-0.5 text-[12px] text-text-muted" style={{ minHeight: 32 }}>{def.tagline}</p>
      <p className="mt-2 num-hero leading-none text-text-primary" style={{ fontSize: 28 }}>
        {def.monthly === 0 ? '€0' : `€${per.toFixed(2)}`}
        {def.monthly !== 0 && <span className="text-[12px] font-normal text-text-muted"> /mo</span>}
      </p>
      {period === 'annual' && def.monthly !== 0 && (
        <p className="text-[11px] text-text-muted">billed €{(def.monthly * 10).toFixed(2)}/yr</p>
      )}

      <ul className="mt-3 flex flex-1 flex-col gap-1.5">
        {CARD_FEATURES.map((f) => {
          const on = hasFeature(tier, f)
          return (
            <li key={f} className="flex items-center gap-2 text-[12px]">
              {on
                ? <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-success)' }} />
                : <X className="h-3.5 w-3.5 flex-shrink-0 text-text-muted opacity-50" />}
              <span className={on ? 'text-text-secondary' : 'text-text-muted line-through opacity-60'}>
                {FEATURE_LABELS[f]}
              </span>
            </li>
          )
        })}
      </ul>

      <button
        onClick={() => onChoose(tier)}
        disabled={isCurrent || tier === 'free'}
        className="btn-accent mt-4 inline-flex h-9 items-center justify-center rounded-md text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        style={{ backgroundColor: def.recommended ? 'var(--color-accent)' : 'var(--bg-elevated)' }}
      >
        {label}
      </button>
    </div>
  )
}

// ── Pricing content (shared by modal + /pricing page) ───────────────────────────

export function PricingContent({ onChoose, compact = false }: { onChoose: (t: Tier) => void; compact?: boolean }) {
  const { plan } = usePlan()
  const [period, setPeriod] = useState<BillingPeriod>('monthly')
  const [showTable, setShowTable] = useState(false)
  const paidTiers = TIERS.filter((t) => t.key !== 'free' || !compact)

  return (
    <div>
      <div className="mb-4 flex justify-center">
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      <div className={`grid gap-3 ${compact ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {paidTiers.map((t) => (
          <TierCard key={t.key} tier={t.key} period={period} current={plan} onChoose={onChoose} />
        ))}
      </div>

      {/* Trust row */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[12px] text-text-muted">
        <span className="inline-flex items-center gap-1.5"><Ban className="h-3.5 w-3.5" /> Cancel anytime</span>
        <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Secure payment</span>
        <span className="inline-flex items-center gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> 14-day money-back guarantee</span>
      </div>
      <p className="mt-1.5 text-center text-[11px] text-text-muted">Prices in euros, incl. VAT.</p>

      {/* Full comparison */}
      <button
        onClick={() => setShowTable((v) => !v)}
        className="mx-auto mt-4 flex items-center gap-1 text-[13px] font-medium"
        style={{ color: 'var(--color-accent)' }}
      >
        Compare all features
        <ChevronDown className="h-4 w-4" style={{ transform: showTable ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }} />
      </button>
      {showTable && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="py-2 pr-3 text-left font-medium text-text-muted">Feature</th>
                {TIERS.map((t) => (
                  <th key={t.key} className="px-2 py-2 text-center font-medium text-text-secondary">{t.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.label} className="border-t border-subtle">
                  <td className="py-2 pr-3 text-text-secondary">{row.label}</td>
                  {TIERS.map((t) => {
                    const v = row.check(t.key)
                    return (
                      <td key={t.key} className="px-2 py-2 text-center">
                        {typeof v === 'boolean'
                          ? (v ? <Check className="mx-auto h-3.5 w-3.5" style={{ color: 'var(--color-success)' }} /> : <span className="text-text-muted opacity-40">—</span>)
                          : <span className="text-text-secondary">{v}</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Checkout placeholder ─────────────────────────────────────────────────────────

function CheckoutView({ tier, onBack, onDone }: { tier: Tier; onBack: () => void; onDone: () => void }) {
  const [period, setPeriod] = useState<BillingPeriod>('monthly')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const def = tierDef(tier)

  const join = async () => {
    setBusy(true)
    const res = await upgradeToPlan(tier, period, email || undefined)
    setBusy(false)
    if (res.kind === 'activated') { toast.success(`${def.name} activated (dev)`); onDone() }
    else if (res.kind === 'waitlisted') { toast.success('You’re on the waitlist — we’ll email you at launch.'); onDone() }
    else toast.error(res.message)
  }

  const trial = async () => {
    setBusy(true)
    await startTrial(tier)
    setBusy(false)
    toast.success(`Your 14-day ${def.name} trial has started 🎉`)
    onDone()
  }

  return (
    <div>
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-[13px] text-text-secondary hover:text-text-primary">
        <ChevronLeft className="h-4 w-4" /> All plans
      </button>

      <div className="mb-4 flex justify-center"><PeriodToggle value={period} onChange={setPeriod} /></div>

      {/* Order summary */}
      <div className="rounded-lg border border-default bg-bg-elevated p-4">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-text-primary">{def.name}</span>
          <span className="text-[14px] font-semibold text-text-primary">{priceSummary(tier, period)}</span>
        </div>
        <p className="mt-0.5 text-[12px] text-text-muted">{def.tagline}</p>
      </div>

      {/* Payments-launching-soon banner + waitlist */}
      <div className="mt-4 rounded-lg border p-4" style={{ borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-muted)' }}>
        <p className="text-[13px] font-medium text-text-primary">🔒 Payments launching soon</p>
        <p className="mt-1 text-[12px] text-text-secondary">
          Join the waitlist to be notified the moment premium goes live.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-10 flex-1 rounded-md border border-default bg-bg-input px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent"
          />
          <button
            onClick={join}
            disabled={busy}
            className="btn-accent inline-flex h-10 flex-shrink-0 items-center rounded-md px-4 text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {busy ? 'Saving…' : 'Notify me'}
          </button>
        </div>
      </div>

      {/* Free trial — full premium UX, no payment */}
      <button
        onClick={trial}
        disabled={busy}
        className="mt-3 w-full rounded-md border border-default py-2.5 text-[13px] font-medium text-text-primary hover:bg-bg-elevated disabled:opacity-60"
      >
        Try {def.name} free for 14 days
      </button>

      <p className="mt-3 text-center text-[11px] text-text-muted">
        Cancel anytime · Secure payment · Prices incl. VAT
      </p>
    </div>
  )
}

// ── Modal shell ──────────────────────────────────────────────────────────────────

export function UpgradeModal({
  open, preselect, onClose,
}: {
  open: boolean
  preselect: Tier | null
  onClose: () => void
}) {
  const [checkout, setCheckout] = useState<Tier | null>(null)
  const [wasOpen, setWasOpen] = useState(false)

  // Reset to the right view when the modal opens (render-time prop-change
  // pattern — no setState-in-effect).
  if (open && !wasOpen) {
    setWasOpen(true)
    setCheckout(preselect && preselect !== 'free' ? preselect : null)
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-6" role="dialog" aria-modal="true" aria-label="Upgrade">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden />
      <div className="glass modal-pop relative z-10 my-auto w-full max-w-3xl" style={{ borderRadius: 'var(--radius-xl)' }}>
        <div className="flex items-center justify-between border-b border-subtle px-5 py-3.5">
          <h2 className="text-[16px] font-semibold text-text-primary">
            {checkout ? 'Complete your upgrade' : 'Upgrade Vallety'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-card hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          {checkout
            ? <CheckoutView tier={checkout} onBack={() => setCheckout(null)} onDone={onClose} />
            : <PricingContent compact onChoose={(t) => setCheckout(t)} />}
        </div>
      </div>
    </div>
  )
}
