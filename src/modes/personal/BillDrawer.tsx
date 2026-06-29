import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Trash2 } from 'lucide-react'
import toast from '../../components/Toast'
import { cn } from '../../shared/lib/cn'
import { Drawer } from '../../components/Drawer'
import { FieldError, RequiredMark } from '../../shared/components/FormField'
import { useShake } from '../../shared/hooks/useShake'
import { parseAmount } from '../../shared/lib/formatters'
import { billSchema, type BillFormValues } from '../../shared/lib/formSchemas'
import { getCategoryMeta } from '../../shared/lib/transactions'
import {
  addBill, updateBill, deleteBill, defaultDueDate, FREQUENCY_LABELS,
  type Bill, type Frequency,
} from '../../shared/lib/bills'

const fieldClass =
  'w-full rounded-md border border-default bg-bg-input px-3 h-10 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent'

const BILL_CATEGORIES = [
  'Housing', 'Utilities', 'Bills', 'Entertainment',
  'Transport', 'Healthcare', 'Shopping', 'Other',
]

const FREQUENCIES: Frequency[] = ['weekly', 'monthly', 'quarterly', 'annually']

interface Props {
  open: boolean
  mode: 'add' | 'edit'
  bill?: Bill | null
  onClose: () => void
  onSaved: (bills: Bill[]) => void
}

export function BillDrawer({ open, mode, bill, onClose, onSaved }: Props) {
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [dueDate, setDueDate] = useState('')
  const [category, setCategory] = useState('Bills')
  const [isTrial, setIsTrial] = useState(false)
  const [trialEndsOn, setTrialEndsOn] = useState('')
  const [wasOpen, setWasOpen] = useState(false)

  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    mode: 'onBlur',
    defaultValues: { name: '', amount: '' },
  })
  const { shaking, triggerShake, shakeProps } = useShake()
  const submittingRef = useRef(false)

  if (open && !wasOpen) {
    setWasOpen(true)
    if (mode === 'edit' && bill) {
      setFrequency(bill.frequency)
      setDueDate(bill.nextDue.slice(0, 10))
      setCategory(bill.category)
      setIsTrial(Boolean(bill.isTrial))
      setTrialEndsOn(bill.trialEndsOn ? bill.trialEndsOn.slice(0, 10) : '')
    } else {
      setFrequency('monthly')
      setDueDate(defaultDueDate(new Date())); setCategory('Bills')
      setIsTrial(false); setTrialEndsOn('')
    }
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  useEffect(() => {
    if (!open) return
    reset(
      mode === 'edit' && bill
        ? { name: bill.name, amount: String(bill.amount) }
        : { name: '', amount: '' }
    )
    submittingRef.current = false
  }, [open, mode, bill, reset])

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

  const onValid = (values: BillFormValues) => {
    const payload = {
      name: values.name.trim(),
      amount: parseAmount(values.amount),
      frequency,
      nextDue: new Date(dueDate || defaultDueDate(new Date())).toISOString(),
      category,
      isTrial,
      trialEndsOn: isTrial && trialEndsOn ? new Date(trialEndsOn).toISOString() : undefined,
    }
    if (mode === 'edit' && bill) {
      onSaved(updateBill(bill.id, payload))
      toast.success('Bill updated')
    } else {
      onSaved(addBill(payload))
      toast.success('Bill saved')
    }
    onClose()
  }

  // Guard against double-submit (ref accessed only in this event handler).
  const handleSave = () => {
    if (submittingRef.current) return
    submittingRef.current = true
    handleSubmit(onValid, () => {
      submittingRef.current = false
      triggerShake()
    })()
  }

  const handleDelete = () => {
    if (mode === 'edit' && bill) {
      onSaved(deleteBill(bill.id))
      toast.success('Bill deleted')
      onClose()
    }
  }

  return (
    <Drawer open={open} onClose={onClose} ariaLabel={mode === 'add' ? 'New bill' : 'Edit bill'}>
        <div className="flex items-center justify-between border-b border-subtle px-5 py-3.5">
          <h2 className="text-[16px] font-semibold text-text-primary">
            {mode === 'add' ? 'New bill' : 'Edit bill'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-muted">Bill name<RequiredMark /></span>
              <input className={fieldClass} placeholder="e.g. Rent" {...register('name')} />
              <FieldError message={errors.name?.message} />
            </label>

            <div>
              <span className="text-[12px] text-text-muted">Amount<RequiredMark /></span>
              <div className="mt-1 flex items-end gap-2 border-b-2 border-default py-1.5 focus-within:border-accent">
                <span className="text-[24px] font-medium leading-none text-text-muted">€</span>
                <input
                  inputMode="decimal"
                  placeholder="0"
                  className="w-full border-0 bg-transparent p-0 text-[32px] font-bold leading-none text-text-primary outline-none placeholder:text-text-muted"
                  {...register('amount')}
                />
              </div>
              <FieldError message={errors.amount?.message} />
            </div>

            <div>
              <span className="text-[12px] text-text-muted">Frequency</span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {FREQUENCIES.map((f) => {
                  const active = frequency === f
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFrequency(f)}
                      className={cn(
                        'h-9 rounded-full px-3 text-[13px] font-medium',
                        active ? 'text-white' : 'border border-default text-text-secondary hover:text-text-primary'
                      )}
                      style={active ? { backgroundColor: 'var(--color-accent)' } : undefined}
                    >
                      {f === 'annually' ? 'Annually' : FREQUENCY_LABELS[f]}
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-muted">First / next due date</span>
              <input className={fieldClass} type="date" value={dueDate}
                onChange={(e) => setDueDate(e.target.value)} />
            </label>

            <div>
              <span className="text-[12px] text-text-muted">Category</span>
              <div className="mt-1.5 grid grid-cols-4 gap-2">
                {BILL_CATEGORIES.map((c) => {
                  const meta = getCategoryMeta(c)
                  const Icon = meta.icon
                  const selected = category === c
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
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

            {/* Free trial toggle */}
            <div className="rounded-md border border-default p-3">
              <label className="flex items-center justify-between">
                <span className="text-[13px] text-text-primary">Free trial</span>
                <input
                  type="checkbox"
                  checked={isTrial}
                  onChange={(e) => setIsTrial(e.target.checked)}
                  style={{ accentColor: 'var(--color-accent)' }}
                  className="h-4 w-4"
                />
              </label>
              {isTrial && (
                <label className="mt-3 flex flex-col gap-1.5">
                  <span className="text-[12px] text-text-muted">Trial ends on</span>
                  <input className={fieldClass} type="date" value={trialEndsOn}
                    onChange={(e) => setTrialEndsOn(e.target.value)} />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-subtle p-4">
          <button
            type="button"
            onClick={handleSave}
            className={cn(
              'flex h-11 w-full items-center justify-center rounded-md text-[14px] font-semibold text-white',
              shaking && 'shake'
            )}
            style={{ backgroundColor: 'var(--color-accent)', transition: 'var(--transition-fast)' }}
            {...shakeProps}
          >
            Save bill
          </button>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center justify-center gap-1.5 py-1.5 text-[14px] font-medium"
              style={{ color: 'var(--color-danger)' }}
            >
              <Trash2 className="h-4 w-4" /> Delete bill
            </button>
          )}
        </div>
    </Drawer>
  )
}
