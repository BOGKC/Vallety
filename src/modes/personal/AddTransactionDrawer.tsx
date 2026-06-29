import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ChevronLeft, X, Loader2, Check,
} from 'lucide-react'
import toast from '../../components/Toast'
import { cn } from '../../shared/lib/cn'
import { Drawer } from '../../components/Drawer'
import { FieldError, RequiredMark } from '../../shared/components/FormField'
import { useShake } from '../../shared/hooks/useShake'
import { parseAmount } from '../../shared/lib/formatters'
import { transactionSchema, type TransactionFormValues } from '../../shared/lib/formSchemas'
import {
  addTransaction, getCategoryMeta, getMerchantSuggestions, suggestCategory,
  readTransactions, type Txn, type TxnType,
} from '../../shared/lib/transactions'

type StepType = TxnType | 'transfer'
type SaveState = 'idle' | 'saving' | 'done'

const TYPE_CARDS: {
  value: StepType
  title: string
  examples: string
  icon: typeof ArrowDownLeft
  color: string
  bg: string
}[] = [
  {
    value: 'income', title: 'Income', examples: 'Salary, freelance, refunds',
    icon: ArrowDownLeft, color: '#22C55E', bg: 'rgba(34,197,94,0.06)',
  },
  {
    value: 'expense', title: 'Expense', examples: 'Shopping, bills, food',
    icon: ArrowUpRight, color: '#EF4444', bg: 'rgba(239,68,68,0.06)',
  },
  {
    value: 'transfer', title: 'Transfer', examples: 'Between your accounts',
    icon: ArrowLeftRight, color: 'var(--color-accent)', bg: 'var(--color-accent-muted)',
  },
]

const CATEGORY_GRID = [
  'Groceries', 'Dining', 'Transport', 'Housing', 'Healthcare',
  'Entertainment', 'Shopping', 'Utilities', 'Income', 'Other',
]

function isoForMode(mode: 'today' | 'yesterday' | 'pick', picked: string): string {
  const d = new Date()
  if (mode === 'yesterday') d.setDate(d.getDate() - 1)
  if (mode === 'pick') return new Date(picked).toISOString()
  return d.toISOString()
}

interface Props {
  open: boolean
  onClose: () => void
  onAdded: (txns: Txn[]) => void
}

export function AddTransactionDrawer({ open, onClose, onAdded }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [type, setType] = useState<StepType>('expense')
  const [merchantFocused, setMerchantFocused] = useState(false)
  const [dateMode, setDateMode] = useState<'today' | 'yesterday' | 'pick'>('today')
  const [pickedDate, setPickedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('Other')
  const [categoryTouched, setCategoryTouched] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const amountRef = useRef<HTMLInputElement>(null)
  const saveTimers = useRef<number[]>([])
  const [pastTxns, setPastTxns] = useState<Txn[]>([])
  const [wasOpen, setWasOpen] = useState(false)

  const {
    register, handleSubmit, reset, setValue, control, formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    mode: 'onBlur',
    defaultValues: { merchant: '', amount: '' },
  })
  const { shaking, triggerShake, shakeProps } = useShake()

  const merchant = useWatch({ control, name: 'merchant' }) ?? ''

  // Reset the custom (non-RHF) state the moment the drawer opens. Adjusting
  // state during render (guarded by a previous-value flag) is React's
  // recommended pattern for reacting to a prop change without a cascading effect.
  if (open && !wasOpen) {
    setWasOpen(true)
    setPastTxns(readTransactions())
    setStep(1); setType('expense')
    setMerchantFocused(false); setDateMode('today')
    setPickedDate(new Date().toISOString().slice(0, 10))
    setCategory('Other'); setCategoryTouched(false); setNotesOpen(false); setNotes('')
    setSaveState('idle')
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  // Reset the RHF-managed fields when the drawer opens.
  useEffect(() => {
    if (open) reset({ merchant: '', amount: '' })
  }, [open, reset])

  // Cancel any pending save timers when the drawer closes or unmounts, so a
  // stale timer can't fire onClose/setSaveState against a reopened session.
  useEffect(() => {
    return () => {
      saveTimers.current.forEach((id) => window.clearTimeout(id))
      saveTimers.current = []
    }
  }, [open])

  // Close on Escape + lock body scroll while open.
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

  // Auto-focus the amount field when step 2 opens.
  useEffect(() => {
    if (open && step === 2) {
      const id = window.setTimeout(() => amountRef.current?.focus(), 60)
      return () => window.clearTimeout(id)
    }
  }, [open, step])

  const merchantReg = register('merchant')
  const amountReg = register('amount')

  // Auto-suggest category from merchant unless the user picked one.
  const applyMerchant = (value: string) => {
    if (!categoryTouched) setCategory(suggestCategory(value, pastTxns))
  }

  const suggestions = merchantFocused ? getMerchantSuggestions(merchant, pastTxns) : []

  const onValid = (values: TransactionFormValues) => {
    if (saveState !== 'idle') return
    setSaveState('saving')
    const next = addTransaction({
      type: type === 'transfer' ? 'expense' : type,
      amount: parseAmount(values.amount),
      merchant: values.merchant.trim(),
      category,
      date: isoForMode(dateMode, pickedDate),
      notes: notes.trim() || undefined,
      account: 'Manual entry',
    })
    // Show "Saving…", then a brief success state, then close. Timer ids are
    // tracked so they can be cancelled if the drawer closes mid-sequence.
    const t1 = window.setTimeout(() => {
      onAdded(next)
      setSaveState('done')
      const t2 = window.setTimeout(() => {
        toast.success('Transaction added')
        onClose()
      }, 500)
      saveTimers.current.push(t2)
    }, 400)
    saveTimers.current.push(t1)
  }

  // Wrap submit so handleSubmit (and onValid's ref access) runs in an event
  // handler rather than during render.
  const handleSave = () => handleSubmit(onValid, triggerShake)()

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1)
  const pillBase = 'h-9 rounded-full px-3 text-[13px] font-medium'

  return (
    <Drawer open={open} onClose={onClose} ariaLabel="Add transaction">
        {step === 1 ? (
          // ── STEP 1: type ──
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-end px-4 pt-4">
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 pb-2 pt-2 text-center">
              <h2 className="text-[18px] font-semibold text-text-primary">What type?</h2>
              <p className="mt-1 text-[14px] text-text-secondary">Choose the transaction type</p>
            </div>

            <div className="flex flex-col gap-3 p-6">
              {TYPE_CARDS.map((card) => {
                const selected = type === card.value
                const Icon = card.icon
                return (
                  <button
                    key={card.value}
                    type="button"
                    onClick={() => setType(card.value)}
                    className="flex h-[72px] items-center gap-3 rounded-lg border px-4 text-left"
                    style={{
                      borderWidth: selected ? 1.5 : 1,
                      borderColor: selected ? card.color : 'var(--border-default)',
                      backgroundColor: selected ? card.bg : 'var(--bg-card)',
                      transition: 'var(--transition-fast)',
                    }}
                  >
                    <Icon className="h-6 w-6 flex-shrink-0" style={{ color: card.color }} />
                    <span className="flex flex-col">
                      <span className="text-[16px] font-semibold text-text-primary">{card.title}</span>
                      <span className="text-[13px] text-text-secondary">{card.examples}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-auto p-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex h-11 w-full items-center justify-center rounded-md text-[14px] font-medium text-white"
                style={{ backgroundColor: 'var(--color-accent)', transition: 'var(--transition-fast)' }}
              >
                Continue
              </button>
            </div>
          </div>
        ) : (
          // ── STEP 2: details ──
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 px-4 py-3.5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                aria-label="Back"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="text-[16px] font-semibold text-text-primary">Add {typeLabel}</h2>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-4">
              {/* AMOUNT */}
              <div>
                <div className="flex items-end gap-2 border-b-2 border-default py-3 focus-within:border-accent">
                  <span className="text-[32px] font-medium leading-none text-text-muted">€</span>
                  <input
                    {...amountReg}
                    ref={(el) => { amountReg.ref(el); amountRef.current = el }}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-full border-0 bg-transparent p-0 text-[40px] font-bold leading-none text-text-primary outline-none placeholder:text-text-muted"
                    style={{ appearance: 'textfield' }}
                  />
                </div>
                <FieldError message={errors.amount?.message} />
              </div>

              {/* MERCHANT */}
              <div className="relative mt-5">
                <label className="text-[12px] text-text-muted">Merchant / Description<RequiredMark /></label>
                <input
                  {...merchantReg}
                  onChange={(e) => { merchantReg.onChange(e); applyMerchant(e.target.value) }}
                  onFocus={() => setMerchantFocused(true)}
                  onBlur={(e) => { merchantReg.onBlur(e); window.setTimeout(() => setMerchantFocused(false), 120) }}
                  placeholder="e.g. Tesco"
                  className="mt-1 h-11 w-full rounded-md border border-default bg-bg-input px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent"
                />
                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-md border border-default bg-bg-elevated shadow-lg">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setValue('merchant', s, { shouldValidate: true })
                          applyMerchant(s)
                          setMerchantFocused(false)
                        }}
                        className="flex h-10 w-full items-center px-3 text-left text-[13px] text-text-primary hover:bg-bg-card"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                <FieldError message={errors.merchant?.message} />
              </div>

              {/* DATE */}
              <div className="mt-4">
                <label className="text-[12px] text-text-muted">Date</label>
                <div className="mt-1 flex items-center gap-2">
                  {(['today', 'yesterday', 'pick'] as const).map((m) => {
                    const active = dateMode === m
                    const label = m === 'today' ? 'Today' : m === 'yesterday' ? 'Yesterday' : 'Pick date'
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDateMode(m)}
                        className={cn(pillBase, active ? 'text-white' : 'border border-default text-text-secondary hover:text-text-primary')}
                        style={active ? { backgroundColor: 'var(--color-accent)' } : undefined}
                      >
                        {label}
                      </button>
                    )
                  })}
                  {dateMode === 'pick' && (
                    <input
                      type="date"
                      value={pickedDate}
                      onChange={(e) => setPickedDate(e.target.value)}
                      className="h-9 rounded-md border border-default bg-bg-input px-2 text-[13px] text-text-primary focus:border-accent"
                    />
                  )}
                </div>
              </div>

              {/* CATEGORY */}
              <div className="mt-4">
                <label className="text-[12px] text-text-muted">Category</label>
                <div className="mt-1.5 grid grid-cols-4 gap-2">
                  {CATEGORY_GRID.map((c) => {
                    const meta = getCategoryMeta(c)
                    const Icon = meta.icon
                    const selected = category === c
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setCategory(c); setCategoryTouched(true) }}
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
              </div>

              {/* NOTES */}
              <div className="mt-4">
                {notesOpen ? (
                  <div>
                    <label className="text-[12px] text-text-muted">Note</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Add a note..."
                      className="mt-1 w-full resize-none rounded-md border border-default bg-bg-input px-3 py-2 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setNotesOpen(true)}
                    className="text-[13px] font-medium"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    + Add note
                  </button>
                )}
              </div>
            </div>

            {/* FOOTER */}
            <div className="border-t border-subtle p-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saveState !== 'idle'}
                className={cn(
                  'flex h-12 w-full items-center justify-center gap-2 rounded-md text-[15px] font-semibold text-white',
                  shaking && 'shake'
                )}
                style={{ backgroundColor: 'var(--color-accent)', transition: 'var(--transition-fast)' }}
                {...shakeProps}
              >
                {saveState === 'saving' ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                ) : saveState === 'done' ? (
                  <><Check className="h-4 w-4" /> Added</>
                ) : (
                  'Add transaction'
                )}
              </button>
            </div>
          </div>
        )}
    </Drawer>
  )
}
