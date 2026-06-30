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
import { accountSchema, type AccountFormValues } from '../../shared/lib/formSchemas'
import {
  addAccount, updateAccount, deleteAccount, ACCOUNT_TYPES,
  type Account, type AccountType,
} from '../../shared/lib/netWorth'

const fieldClass =
  'w-full rounded-md border border-default bg-bg-input px-3 h-10 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF']

interface Props {
  open: boolean
  mode: 'add' | 'edit'
  account?: Account | null
  onClose: () => void
  onSaved: (accounts: Account[]) => void
}

export function AccountDrawer({ open, mode, account, onClose, onSaved }: Props) {
  const [type, setType] = useState<AccountType>('checking')
  const [institution, setInstitution] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [wasOpen, setWasOpen] = useState(false)

  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    mode: 'onBlur',
    defaultValues: { name: '', balance: '' },
  })
  const { shaking, triggerShake, shakeProps } = useShake()
  const submittingRef = useRef(false)

  if (open && !wasOpen) {
    setWasOpen(true)
    if (mode === 'edit' && account) {
      setType(account.type)
      setInstitution(account.institution ?? '')
      setCurrency(account.currency)
    } else {
      setType('checking'); setInstitution(''); setCurrency('EUR')
    }
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  useEffect(() => {
    if (!open) return
    reset(
      mode === 'edit' && account
        ? { name: account.name, balance: String(account.balance) }
        : { name: '', balance: '' }
    )
    submittingRef.current = false
  }, [open, mode, account, reset])

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

  const onValid = (values: AccountFormValues) => {
    const payload = {
      name: values.name.trim(),
      type,
      institution: institution.trim() || undefined,
      balance: parseAmount(values.balance),
      currency,
    }
    if (mode === 'edit' && account) {
      onSaved(updateAccount(account.id, payload))
      toast.success('Account updated')
    } else {
      onSaved(addAccount(payload))
      toast.success('Account added')
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
    if (mode === 'edit' && account) {
      onSaved(deleteAccount(account.id))
      toast.success('Account deleted')
      onClose()
    }
  }

  return (
    <Drawer open={open} onClose={onClose} ariaLabel={mode === 'add' ? 'Add account' : 'Edit account'}>
        <div className="flex items-center justify-between border-b border-subtle px-5 py-3.5">
          <h2 className="text-[16px] font-semibold text-text-primary">
            {mode === 'add' ? 'Add account' : 'Edit account'}
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
              <span className="text-[12px] text-text-muted">Account name<RequiredMark /></span>
              <input className={fieldClass} placeholder="e.g. Main current account" {...register('name')} />
              <FieldError message={errors.name?.message} />
            </label>

            <div>
              <span className="text-[12px] text-text-muted">Type</span>
              <div className="mt-1.5 grid grid-cols-4 gap-2">
                {ACCOUNT_TYPES.map((t) => {
                  const Icon = t.icon
                  const selected = type === t.type
                  return (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setType(t.type)}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border"
                      style={{
                        borderWidth: selected ? 1.5 : 1,
                        borderColor: selected ? 'var(--color-accent)' : 'var(--border-default)',
                        backgroundColor: selected ? 'var(--color-accent-muted)' : 'transparent',
                        transition: 'var(--transition-fast)',
                      }}
                    >
                      <Icon className="h-5 w-5" style={{ color: selected ? 'var(--color-accent)' : 'var(--text-secondary)' }} />
                      <span className="text-[10px] text-text-secondary">{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-muted">Institution (optional)</span>
              <input className={fieldClass} value={institution} placeholder="e.g. OP"
                onChange={(e) => setInstitution(e.target.value)} />
            </label>

            <div className="flex gap-3">
              <div className="flex-1">
                <span className="text-[12px] text-text-muted">Current balance<RequiredMark /></span>
                <div className="mt-1 flex items-end gap-2 border-b-2 border-default py-1.5 focus-within:border-accent">
                  <span className="text-[20px] font-medium leading-none text-text-muted">€</span>
                  <input
                    inputMode="decimal"
                    placeholder="0"
                    className="w-full border-0 bg-transparent p-0 text-[28px] font-bold leading-none text-text-primary outline-none placeholder:text-text-muted"
                    {...register('balance')}
                  />
                </div>
                <FieldError message={errors.balance?.message} />
              </div>
              <label className="flex w-24 flex-col gap-1.5">
                <span className="text-[12px] text-text-muted">Currency</span>
                <select className={fieldClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
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
            {mode === 'add' ? 'Add account' : 'Save changes'}
          </button>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center justify-center gap-1.5 py-1.5 text-[14px] font-medium"
              style={{ color: 'var(--color-danger)' }}
            >
              <Trash2 className="h-4 w-4" /> Delete account
            </button>
          )}
        </div>
    </Drawer>
  )
}
