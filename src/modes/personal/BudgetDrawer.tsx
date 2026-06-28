import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, X } from 'lucide-react'
import toast from '../../components/Toast'
import { cn } from '../../shared/lib/cn'
import { Drawer } from '../../components/Drawer'
import { FieldError, RequiredMark } from '../../shared/components/FormField'
import { useShake } from '../../shared/hooks/useShake'
import { budgetSchema, type BudgetFormValues } from '../../shared/lib/formSchemas'
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
  const [period, setPeriod] = useState<BudgetPeriod>('monthly')
  const [color, setColor] = useState<string>(COLOR_SWATCHES[0])
  const [wasOpen, setWasOpen] = useState(false)

  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    mode: 'onBlur',
    defaultValues: { amount: '' },
  })
  const { shaking, triggerShake, shakeProps } = useShake()

  // Reset on open (render-time prop-change pattern; avoids set-state-in-effect).
  if (open && !wasOpen) {
    setWasOpen(true)
    if (prefill) {
      setCategory(prefill.category)
      setColor(getCategoryMeta(prefill.category).color)
      setStep(2)
    } else {
      setCategory('Groceries'); setColor(COLOR_SWATCHES[0]); setStep(1)
    }
    setPeriod('monthly')
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  useEffect(() => {
    if (!open) return
    reset({ amount: prefill ? String(prefill.amount) : '' })
  }, [open, prefill, reset])

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

  const onValid = (values: BudgetFormValues) => {
    const next = addBudget({ category, amount: Number(values.amount), period, color })
    onCreated(next)
    toast.success('Budget created')
    onClose()
  }

  return (
    <Drawer open={open} onClose={onClose} ariaLabel="New budget">
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
                    type="button"
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
              <div>
                <span className="text-[12px] text-text-muted">Amount<RequiredMark /></span>
                <div className="mt-1 flex items-end gap-2 border-b-2 border-default py-2 focus-within:border-accent">
                  <span className="text-[28px] font-medium leading-none text-text-muted">€</span>
                  <input
                    autoFocus
                    inputMode="decimal"
                    placeholder="0"
                    className="w-full border-0 bg-transparent p-0 text-[36px] font-bold leading-none text-text-primary outline-none placeholder:text-text-muted"
                    {...register('amount')}
                  />
                </div>
                <FieldError message={errors.amount?.message} />
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
                        type="button"
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
                      type="button"
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
              type="button"
              onClick={handleSubmit(onValid, triggerShake)}
              className={cn(
                'flex h-11 w-full items-center justify-center rounded-md text-[14px] font-semibold text-white',
                shaking && 'shake'
              )}
              style={{ backgroundColor: 'var(--color-accent)', transition: 'var(--transition-fast)' }}
              {...shakeProps}
            >
              Create budget
            </button>
          </div>
        )}
    </Drawer>
  )
}
