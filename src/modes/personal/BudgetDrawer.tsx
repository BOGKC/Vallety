import { useEffect, useState } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import toast from '../../components/Toast'
import { cn } from '../../shared/lib/cn'
import { getCategoryMeta } from '../../shared/lib/transactions'
import { addBudget, type Budget, type BudgetPeriod } from '../../shared/lib/budgets'

const CATEGORY_GRID = [
  'Groceries', 'Dining', 'Transport', 'Housing', 'Healthcare',
  'Entertainment', 'Shopping', 'Utilities', 'Income', 'Other',
]

const COLOR_SWATCHES = [
  '#3B5BDB', '#22C55E', '#F59E0B', '#EF4444',
  '#9333EA', '#EC4899', '#06B6D4', '#F97316',
]

const PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'yearly', label: 'Yearly' },
]

export interface BudgetPrefill {
  category: string
  amount: number
}

interface Props {
  open: boolean
  prefill?: BudgetPrefill | null
  onClose: () => void
  onCreated: (budgets: Budget[]) => void
}

export function BudgetDrawer({ open, prefill, onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [category, setCategory] = useState('Groceries')
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState<BudgetPeriod>('monthly')
  const [color, setColor] = useState<string>(COLOR_SWATCHES[0])
  const [wasOpen, setWasOpen] = useState(false)

  // Reset on open (render-time prop-change pattern; avoids set-state-in-effect).
  if (open && !wasOpen) {
    setWasOpen(true)
    if (prefill) {
      setCategory(prefill.category)
      setAmount(String(prefill.amount))
      setColor(getCategoryMeta(prefill.category).color)
      setStep(2)
    } else {
      setCategory('Groceries'); setAmount(''); setColor(COLOR_SWATCHES[0]); setStep(1)
    }
    setPeriod('monthly')
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const amountNum = Number(amount)
  const canSave = !!category && Number.isFinite(amountNum) && amountNum > 0

  const handleSave = () => {
    if (!canSave) return
    const next = addBudget({ category, amount: amountNum, period, color })
    onCreated(next)
    toast.success('Budget created')
    onClose()
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/70 transition-opacity duration-[220ms]',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New budget"
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-bg-card shadow-2xl transition-transform duration-[220ms] ease-[cubic-bezier(0.32,0.72,0,1)] sm:w-[420px]',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-subtle px-5 py-3.5">
          {step === 2 && !prefill && (
            <button
              onClick={() => setStep(1)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
              aria-label="Back"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <h2 className="text-[16px] font-semibold text-text-primary">
            {step === 1 ? 'Choose a category' : 'Set the amount'}
          </h2>
          <button
            onClick={onClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 1 ? (
            <div className="grid grid-cols-4 gap-2">
              {CATEGORY_GRID.map((c) => {
                const meta = getCategoryMeta(c)
                const Icon = meta.icon
                const selected = category === c
                return (
                  <button
                    key={c}
                    onClick={() => { setCategory(c); setColor(meta.color); setStep(2) }}
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border"
                    style={{
                      borderWidth: selected ? 1.5 : 1,
                      borderColor: selected ? 'var(--color-accent)' : 'var(--border-default)',
                      backgroundColor: selected ? 'var(--color-accent-muted)' : 'transparent',
                      transition: 'var(--transition-fast)',
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: meta.color }} />
                    <span className="text-[10px] text-text-secondary">{c}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Selected category chip */}
              <div className="flex items-center gap-2">
                {(() => {
                  const meta = getCategoryMeta(category)
                  const Icon = meta.icon
                  return (
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${meta.color}26` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: meta.color }} />
                    </span>
                  )
                })()}
                <span className="text-[14px] font-medium text-text-primary">{category}</span>
              </div>

              {/* Amount */}
              <div className="flex items-end gap-2 border-b-2 border-default py-2 focus-within:border-accent">
                <span className="text-[28px] font-medium leading-none text-text-muted">€</span>
                <input
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="w-full border-0 bg-transparent p-0 text-[36px] font-bold leading-none text-text-primary outline-none placeholder:text-text-muted"
                />
              </div>

              {/* Period */}
              <div>
                <p className="mb-1.5 text-[12px] text-text-muted">Period</p>
                <div className="flex gap-2">
                  {PERIODS.map((p) => {
                    const active = period === p.value
                    return (
                      <button
                        key={p.value}
                        onClick={() => setPeriod(p.value)}
                        className={cn(
                          'h-9 rounded-md px-3 text-[13px] font-medium',
                          active ? 'text-white' : 'border border-default text-text-secondary hover:text-text-primary'
                        )}
                        style={active ? { backgroundColor: 'var(--color-accent)' } : undefined}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Color */}
              <div>
                <p className="mb-1.5 text-[12px] text-text-muted">Colour (optional)</p>
                <div className="flex flex-wrap gap-2">
                  {COLOR_SWATCHES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      aria-label={`Colour ${c}`}
                      className="h-7 w-7 rounded-full"
                      style={{
                        backgroundColor: c,
                        outline: color === c ? '2px solid var(--text-primary)' : 'none',
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 2 && (
          <div className="border-t border-subtle p-4">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="flex h-11 w-full items-center justify-center rounded-md text-[14px] font-semibold text-white"
              style={{
                backgroundColor: 'var(--color-accent)',
                opacity: canSave ? 1 : 0.4,
                cursor: canSave ? 'pointer' : 'not-allowed',
                transition: 'var(--transition-fast)',
              }}
            >
              Create budget
            </button>
          </div>
        )}
      </div>
    </>
  )
}
