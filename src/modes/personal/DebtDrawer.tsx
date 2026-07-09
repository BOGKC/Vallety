import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import toast from '../../components/Toast'
import { cn } from '../../shared/lib/cn'
import { Drawer } from '../../components/Drawer'
import { FieldError, RequiredMark } from '../../shared/components/FormField'
import { useShake } from '../../shared/hooks/useShake'
import { parseAmount } from '../../shared/lib/formatters'
import { debtSchema, type DebtFormValues } from '../../shared/lib/formSchemas'
import { addDebt, DEBT_TYPE_LABELS, type Debt, type DebtType } from '../../shared/lib/debts'

const fieldClass =
  'w-full rounded-md border border-default bg-bg-input px-3 h-10 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (debts: Debt[]) => void
}

export function DebtDrawer({ open, onClose, onSaved }: Props) {
  const [type, setType] = useState<DebtType>('credit_card')
  const [rate, setRate] = useState('')
  const [minPayment, setMinPayment] = useState('')
  const [wasOpen, setWasOpen] = useState(false)

  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm<DebtFormValues>({
    resolver: zodResolver(debtSchema),
    mode: 'onBlur',
    defaultValues: { name: '', balance: '' },
  })
  const { shaking, triggerShake, shakeProps } = useShake()
  const submittingRef = useRef(false)

  if (open && !wasOpen) {
    setWasOpen(true)
    setType('credit_card'); setRate(''); setMinPayment('')
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  useEffect(() => {
    if (!open) return
    reset({ name: '', balance: '' })
    submittingRef.current = false
  }, [open, reset])

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

  const onValid = (values: DebtFormValues) => {
    onSaved(addDebt({
      name: values.name.trim(),
      type,
      balance: parseAmount(values.balance),
      rate: Math.max(0, Number(rate) || 0),
      minPayment: Math.max(0, Number(minPayment) || 0),
    }))
    toast.success('Debt added')
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

  return (
    <Drawer open={open} onClose={onClose} ariaLabel="Add debt">
        <div className="flex items-center justify-between border-b border-subtle px-5 py-3.5">
          <h2 className="text-[16px] font-semibold text-text-primary">Add debt</h2>
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
              <span className="text-[12px] text-text-muted">Name<RequiredMark /></span>
              <input className={fieldClass} placeholder="e.g. Visa card" {...register('name')} />
              <FieldError message={errors.name?.message} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-muted">Type</span>
              <select className={fieldClass} value={type}
                onChange={(e) => setType(e.target.value as DebtType)}>
                {(Object.keys(DEBT_TYPE_LABELS) as DebtType[]).map((t) => (
                  <option key={t} value={t}>{DEBT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-muted">Current balance (€)<RequiredMark /></span>
              <input className={fieldClass} type="number" inputMode="decimal" min="0" step="0.01"
                placeholder="0.00" {...register('balance')} />
              <FieldError message={errors.balance?.message} />
            </label>

            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-[12px] text-text-muted">Interest rate (%)</span>
                <input className={fieldClass} type="number" inputMode="decimal" min="0" step="0.1" value={rate}
                  placeholder="0.0" onChange={(e) => setRate(e.target.value)} />
              </label>
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-[12px] text-text-muted">Min. monthly (€)</span>
                <input className={fieldClass} type="number" inputMode="decimal" min="0" step="0.01" value={minPayment}
                  placeholder="0.00" onChange={(e) => setMinPayment(e.target.value)} />
              </label>
            </div>
          </div>
        </div>

        <div className="border-t border-subtle p-4">
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
            Add debt
          </button>
        </div>
    </Drawer>
  )
}
