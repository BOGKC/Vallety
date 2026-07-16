import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, Briefcase, TrendingUp, Check, ChevronRight, type LucideIcon } from 'lucide-react'
import toast from '../../components/Toast'
import { ValletyLockup } from '../../components/ValletyLogo'
import { supabase } from '../../supabase/client'
import { useAuthStore } from '../../shared/store/authStore'
import { useAppStore } from '../../shared/store/appStore'
import { saveProfilePatch } from '../../shared/lib/profile'
import { cn } from '../../shared/lib/cn'
import type { AppMode } from '../../shared/types'
import type { BusinessType, CurrencyCode } from '../../supabase/types'

// ── Mode cards ────────────────────────────────────────────────────────────────

interface ModeCard {
  mode: AppMode
  icon: LucideIcon
  color: string
  tint: string
  title: string
  description: string
  examples: string
}

const MODE_CARDS: ModeCard[] = [
  {
    mode: 'personal',
    icon: Wallet,
    color: '#3B5BDB',
    tint: 'rgba(59, 91, 219, 0.08)',
    title: 'Personal',
    description: 'Track spending, set budgets, and save toward your goals',
    examples: 'Budgeting · Bills · Savings · Net worth',
  },
  {
    mode: 'business',
    icon: Briefcase,
    color: '#0F9D7A',
    tint: 'rgba(15, 157, 122, 0.08)',
    title: 'Solo founder',
    description: 'Run your business finances — invoices, taxes, and take-home pay',
    examples: 'Invoicing · VAT (ALV) · Advance tax · YEL',
  },
  {
    mode: 'investment',
    icon: TrendingUp,
    color: '#9333EA',
    tint: 'rgba(147, 51, 234, 0.08)',
    title: 'Investor',
    description: 'Track your portfolio and analyze your investment performance',
    examples: 'Holdings · Performance · Dividends · Watchlist',
  },
]

// Local business-structure choices → Supabase enum + local profile value.
const STRUCTURES: { label: string; sub: string; local: string; db: BusinessType }[] = [
  { label: 'Toiminimi', sub: 'Sole trader', local: 'toiminimi', db: 'sole_proprietor' },
  { label: 'Osakeyhtiö (OY)', sub: 'Limited company', local: 'oy', db: 'llc' },
  { label: 'Freelancer', sub: 'Independent contractor', local: 'freelancer', db: 'sole_proprietor' },
  { label: 'Kevytyrittäjä', sub: 'Light entrepreneur', local: 'kevytyrittaja', db: 'other' },
]

const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'CHF', label: 'Swiss Franc', symbol: 'Fr' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
]

const MODE_HOME: Record<AppMode, string> = {
  personal: '/',
  business: '/business',
  investment: '/investment',
}

// ── Step progress ─────────────────────────────────────────────────────────────

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-8 flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
              i < current
                ? 'border-transparent bg-brand text-white'
                : i === current
                  ? 'border-brand text-brand'
                  : 'border-border text-text-muted'
            )}
          >
            {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={cn('h-px w-8 transition-colors', i < current ? 'bg-brand' : 'bg-border')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function OnboardingPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setProfile = useAuthStore((s) => s.setProfile)
  const setMode = useAppStore((s) => s.setMode)

  const [step, setStep] = useState(0)
  const [selectedMode, setSelectedMode] = useState<AppMode | null>(null)
  const [structure, setStructure] = useState<(typeof STRUCTURES)[number] | null>(null)
  const [currency, setCurrency] = useState<CurrencyCode>('EUR')
  const [saving, setSaving] = useState(false)

  const needsStructure = selectedMode === 'business'
  // Steps: 0 mode → (1 structure, founder only) → currency → done
  const totalSteps = needsStructure ? 4 : 3
  const currencyStep = needsStructure ? 2 : 1
  const doneStep = totalSteps - 1

  const canNext =
    (step === 0 && selectedMode !== null) ||
    (needsStructure && step === 1 ? structure !== null : true)

  const finish = async () => {
    if (!selectedMode) return
    setSaving(true)

    // Persist locally first — Vallety is local-first and never blocks on the
    // backend. Business structure also switches the profile page into
    // business mode so the tax fields are ready.
    saveProfilePatch({
      onboarded: true,
      home_currency: currency,
      ...(needsStructure && structure
        ? { business_enabled: true, business_type: structure.local as never }
        : {}),
    })
    setMode(selectedMode)

    if (user) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            active_mode: selectedMode,
            business_type: needsStructure ? structure?.db : undefined,
            currency,
          })
          .eq('id', user.id)
          .select()
          .single()
        if (!error && data) setProfile(data)
      } catch {
        /* proceed regardless — profile sync is best-effort */
      }
    }

    setSaving(false)
    toast.success('Welcome to Vallety!')
    navigate(MODE_HOME[selectedMode], { replace: true })
  }

  const next = () => {
    if (step === 0 && selectedMode && !needsStructure) { setStep(currencyStep); return }
    if (step < doneStep) setStep((s) => s + 1)
  }
  const back = () => {
    if (step === currencyStep && !needsStructure) { setStep(0); return }
    setStep((s) => Math.max(0, s - 1))
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4 py-12">
      <div className="w-full max-w-2xl">
        <ValletyLockup size={38} className="justify-center mb-8" />

        <div className="rounded-2xl border border-border bg-bg-card p-8">
          <StepBar current={step} total={totalSteps} />

          {/* STEP 0 — mode selection */}
          {step === 0 && (
            <>
              <h1 className="text-2xl font-semibold text-text-primary">How will you use Vallety?</h1>
              <p className="mb-6 mt-1 text-sm text-text-secondary">
                This shapes your navigation and dashboard.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {MODE_CARDS.map((c) => {
                  const Icon = c.icon
                  const selected = selectedMode === c.mode
                  return (
                    <button
                      key={c.mode}
                      onClick={() => setSelectedMode(c.mode)}
                      className="card relative flex flex-col items-start gap-2 rounded-xl p-4 text-left"
                      style={{
                        border: selected ? `2px solid ${c.color}` : '1px solid var(--border-default)',
                        backgroundColor: selected ? c.tint : 'var(--bg-elevated)',
                        transition: 'var(--transition-fast)',
                      }}
                    >
                      {selected && (
                        <span
                          className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full"
                          style={{ backgroundColor: c.color }}
                        >
                          <Check className="h-3 w-3 text-white" />
                        </span>
                      )}
                      <Icon className="h-6 w-6" style={{ color: c.color }} />
                      <span className="text-[15px] font-semibold text-text-primary">{c.title}</span>
                      <span className="text-[12px] leading-snug text-text-secondary">{c.description}</span>
                      <span className="mt-auto pt-1 text-[11px] text-text-muted">{c.examples}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-4 text-center text-[12px] text-text-muted">
                You can switch modes or enable more than one anytime.
              </p>
            </>
          )}

          {/* STEP 1 — business structure (founder only) */}
          {needsStructure && step === 1 && (
            <>
              <h1 className="text-2xl font-semibold text-text-primary">What's your business structure?</h1>
              <p className="mb-6 mt-1 text-sm text-text-secondary">
                This tailors the tax features — VAT, advance tax, and YEL.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {STRUCTURES.map((s) => {
                  const selected = structure?.local === s.local
                  return (
                    <button
                      key={s.local}
                      onClick={() => setStructure(s)}
                      className="flex items-center justify-between rounded-xl px-4 py-3.5 text-left"
                      style={{
                        border: selected ? '2px solid #0F9D7A' : '1px solid var(--border-default)',
                        backgroundColor: selected ? 'rgba(15,157,122,0.08)' : 'var(--bg-elevated)',
                        transition: 'var(--transition-fast)',
                      }}
                    >
                      <span>
                        <span className="block text-[14px] font-medium text-text-primary">{s.label}</span>
                        <span className="block text-[12px] text-text-muted">{s.sub}</span>
                      </span>
                      {selected && <Check className="h-4 w-4" style={{ color: '#0F9D7A' }} />}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Currency step */}
          {step === currencyStep && (
            <>
              <h1 className="text-2xl font-semibold text-text-primary">Set your home currency</h1>
              <p className="mb-6 mt-1 text-sm text-text-secondary">
                All amounts across Vallety display in this currency.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CURRENCIES.map((c) => {
                  const selected = currency === c.code
                  return (
                    <button
                      key={c.code}
                      onClick={() => setCurrency(c.code)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 text-left"
                      style={{
                        border: selected ? '2px solid var(--color-accent)' : '1px solid var(--border-default)',
                        backgroundColor: selected ? 'var(--color-accent-muted)' : 'var(--bg-elevated)',
                        transition: 'var(--transition-fast)',
                      }}
                    >
                      <span className={cn('w-7 text-center text-xl font-semibold', selected ? 'text-brand' : 'text-text-secondary')}>
                        {c.symbol}
                      </span>
                      <span className="text-[14px] text-text-primary">{c.label}</span>
                      <span className="ml-auto text-[12px] text-text-muted">{c.code}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Done */}
          {step === doneStep && selectedMode && (
            <div className="py-6 text-center">
              {(() => {
                const card = MODE_CARDS.find((c) => c.mode === selectedMode)!
                const Icon = card.icon
                return (
                  <span
                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: card.tint }}
                  >
                    <Icon className="h-7 w-7" style={{ color: card.color }} />
                  </span>
                )
              })()}
              <h1 className="mt-4 text-2xl font-semibold text-text-primary">You're all set</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm text-text-secondary">
                Vallety is configured for {MODE_CARDS.find((c) => c.mode === selectedMode)?.title.toLowerCase()} use.
                You can switch modes anytime from the sidebar.
              </p>
              <button
                onClick={finish}
                disabled={saving}
                className="btn-accent mx-auto mt-6 inline-flex h-11 items-center gap-2 rounded-md px-6 text-[14px] font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {saving ? 'Setting up…' : 'Go to my dashboard'} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Footer nav */}
          {step < doneStep && (
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={back}
                disabled={step === 0}
                className="text-sm text-text-secondary transition-colors hover:text-text-primary disabled:invisible"
              >
                ← Back
              </button>
              <button
                onClick={next}
                disabled={!canNext}
                className="btn-accent inline-flex h-10 items-center gap-1.5 rounded-md px-5 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
