/* eslint-disable react-refresh/only-export-components -- term defs co-located with the tip by design */
import { useId, useState } from 'react'
import { HelpCircle } from 'lucide-react'

/**
 * A small "?" affordance that explains an unclear concept in plain language on
 * hover (pointer) or tap (touch). Especially for the Finnish tax terms (ALV,
 * YEL, advance tax) and derived figures (safe-to-spend, net worth).
 */
export function InfoTip({ label, text, className }: { label: string; text: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span className={`relative inline-flex ${className ?? ''}`}>
      <button
        type="button"
        aria-label={`What is ${label}?`}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center text-text-muted hover:text-text-secondary"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="glass absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2 rounded-md p-2.5 text-[12px] leading-snug text-text-secondary shadow-xl"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <span className="mb-0.5 block font-semibold text-text-primary">{label}</span>
          {text}
        </span>
      )}
    </span>
  )
}

/** Plain-language definitions, reused wherever a term appears. */
export const TERM_DEFS = {
  safeToSpend: 'What’s free to spend this month after your income, bills, budgets and savings are accounted for.',
  netWorth: 'Everything you own (assets) minus everything you owe (debts). The single number that tracks your overall progress.',
  alv: 'Arvonlisävero — Finnish VAT. Added to your invoices (25.5% general rate) and set aside to pay to Vero.',
  yel: 'Yrittäjän eläkevakuutus — the pension insurance self-employed people in Finland must pay, based on your declared YEL income.',
  advanceTax: 'Ennakkovero — estimated income tax you pre-pay through the year on your business profit. This is an estimate, not tax advice.',
} as const
