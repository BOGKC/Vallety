import { useEffect, useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import toast from '../../components/Toast'
import { Drawer } from '../../components/Drawer'
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
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('checking')
  const [institution, setInstitution] = useState('')
  const [balance, setBalance] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [wasOpen, setWasOpen] = useState(false)

  if (open && !wasOpen) {
    setWasOpen(true)
    if (mode === 'edit' && account) {
      setName(account.name); setType(account.type)
      setInstitution(account.institution ?? ''); setBalance(String(account.balance))
      setCurrency(account.currency)
    } else {
      setName(''); setType('checking'); setInstitution(''); setBalance(''); setCurrency('EUR')
    }
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

  const balanceNum = Number(balance)
  const canSave = name.trim() !== '' && Number.isFinite(balanceNum) && balanceNum >= 0

  const handleSave = () => {
    if (!canSave) return
    const payload = {
      name: name.trim(),
      type,
      institution: institution.trim() || undefined,
      balance: balanceNum,
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
              <span className="text-[12px] text-text-muted">Account name</span>
              <input className={fieldClass} value={name} placeholder="e.g. Main current account"
                onChange={(e) => setName(e.target.value)} />
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
                <span className="text-[12px] text-text-muted">Current balance</span>
                <div className="mt-1 flex items-end gap-2 border-b-2 border-default py-1.5 focus-within:border-accent">
                  <span className="text-[20px] font-medium leading-none text-text-muted">€</span>
                  <input
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                    className="w-full border-0 bg-transparent p-0 text-[28px] font-bold leading-none text-text-primary outline-none placeholder:text-text-muted"
                  />
                </div>
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
            {mode === 'add' ? 'Add account' : 'Save changes'}
          </button>
          {mode === 'edit' && (
            <button
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
