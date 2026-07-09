import { useMemo, useState } from 'react'
import { Percent, PiggyBank, ShieldCheck, Info } from 'lucide-react'
import { AnimatedEuro } from '../../components/AnimatedNumber'
import { formatEuro } from '../../shared/lib/formatters'
import { readProfile } from '../../shared/lib/profile'
import {
  readInvoices, readExpenses, computeBusinessSummary, ADVANCE_TAX_RATE,
} from '../../shared/lib/business'

export function TaxPage() {
  const [invoices] = useState(() => readInvoices())
  const [expenses] = useState(() => readExpenses())
  const profile = useMemo(() => readProfile(), [])
  const now = useMemo(() => new Date(), [])
  const s = useMemo(() => computeBusinessSummary(invoices, expenses, now), [invoices, expenses, now])

  const vatFrequency = profile.vat_registered
    ? { monthly: 'monthly', quarterly: 'quarterly', annual: 'annually' }[profile.vat_frequency]
    : null

  const setAside = s.vatOwed + s.advanceTaxYtd + s.yelMonthly * (now.getMonth() + 1)

  const cards = [
    {
      icon: Percent,
      label: 'ALV owed to Vero',
      value: s.vatOwed,
      sub: profile.vat_registered
        ? `VAT collected minus deductible VAT, YTD — you file ${vatFrequency}`
        : 'VAT collected minus deductible VAT, year to date',
    },
    {
      icon: PiggyBank,
      label: 'Estimated advance tax (ennakkovero)',
      value: s.advanceTaxYtd,
      sub: `${Math.round(ADVANCE_TAX_RATE * 100)}% of YTD profit (${formatEuro(s.profitYtd)})`,
    },
    {
      icon: ShieldCheck,
      label: 'YEL contribution',
      value: s.yelMonthly,
      sub: profile.yel_income
        ? `per month, from your declared YEL income of €${profile.yel_income}`
        : 'per month — set your YEL income in Profile → Business to calculate this',
    },
  ]

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 text-[18px] font-semibold text-text-primary">Tax &amp; ALV</h1>

      {/* Recommended set-aside hero */}
      <div className="relative">
        <div className="hero-glow" aria-hidden />
        <div className="relative rounded-lg bg-bg-card p-6 text-center">
          <p className="text-[12px] font-medium uppercase text-text-muted" style={{ letterSpacing: '0.08em' }}>
            Recommended to set aside
          </p>
          <p className="num-hero mt-1 leading-none text-text-primary" style={{ fontSize: 'clamp(32px, 9vw, 44px)' }}>
            <AnimatedEuro value={setAside} />
          </p>
          <p className="mt-2 text-[13px] text-text-secondary">
            ALV owed + estimated advance tax + YEL for the year so far
          </p>
        </div>
      </div>

      <div className="stagger-list mt-4 flex flex-col gap-3">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="flex items-center gap-4 rounded-lg border border-default bg-bg-card p-4">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--color-accent-muted)' }}>
                <Icon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-text-primary">{c.label}</p>
                <p className="text-[12px] text-text-muted">{c.sub}</p>
              </div>
              <span className="text-[18px] font-semibold text-text-primary">{formatEuro(c.value)}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-md border border-default bg-bg-elevated px-3.5 py-3">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-info)' }} />
        <p className="text-[12px] leading-relaxed text-text-secondary">
          These are rough estimates to help you set money aside — not official calculations.
          Your actual advance tax depends on your total income and municipality, and ALV filing
          follows your Vero schedule. Always confirm figures with your accountant
          (veroasiantuntija) or directly with Vero.
        </p>
      </div>
    </div>
  )
}
