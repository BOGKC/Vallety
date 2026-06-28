import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import toast from '../../components/Toast'
import { cn } from '../../shared/lib/cn'
import { Drawer } from '../../components/Drawer'
import {
  addManualSub, updateManualSub, type ManualSub, type SubFrequency,
} from '../../shared/lib/subscriptions'

const fieldClass =
  'w-full rounded-md border border-default bg-bg-input px-3 h-10 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent'

export interface SubPrefill {
  merchant: string
  amount: number
  frequency: SubFrequency
  lastCharged?: string
}

interface Props {
  open: boolean
  mode: 'add' | 'edit'
  sub?: ManualSub | null
  prefill?: SubPrefill | null
  onClose: () => void
  onSaved: (subs: ManualSub[]) => void
}

export function SubscriptionDrawer({ open, mode, sub, prefill, onClose, onSaved }: Props) {
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<SubFrequency>('monthly')
  const [lastCharged, setLastCharged] = useState('')
  const [wasOpen, setWasOpen] = useState(false)

  if (open && !wasOpen) {
    setWasOpen(true)
    if (mode === 'edit' && sub) {
      setMerchant(sub.merchant); setAmount(String(sub.amount))
      setFrequency(sub.frequency); setLastCharged(sub.lastCharged.slice(0, 10))
    } else if (prefill) {
      setMerchant(prefill.merchant); setAmount(String(prefill.amount))
      setFrequency(prefill.frequency)
      setLastCharged((prefill.lastCharged ?? new Date().toISOString()).slice(0, 10))
    } else {
      setMerchant(''); setAmount(''); setFrequency('monthly')
      setLastCharged(new Date().toISOString().slice(0, 10))
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

  const amountNum = Number(amount)
  const canSave = merchant.trim() !== '' && Number.isFinite(amountNum) && amountNum > 0

  const handleSave = () => {
    if (!canSave) return
    const payload = {
      merchant: merchant.trim(),
      amount: amountNum,
      frequency,
      lastCharged: new Date(lastCharged || new Date().toISOString()).toISOString(),
    }
    if (mode === 'edit' && sub) {
      onSaved(updateManualSub(sub.id, payload))
      toast.success('Subscription updated')
    } else {
      onSaved(addManualSub({ ...payload, status: 'active' }))
      toast.success('Subscription added')
    }
    onClose()
  }

  return (
    <Drawer open={open} onClose={onClose} ariaLabel={mode === 'add' ? 'Add subscription' : 'Edit subscription'}>
        <div className="flex items-center justify-between border-b border-subtle px-5 py-3.5">
          <h2 className="text-[16px] font-semibold text-text-primary">
            {mode === 'add' ? 'Add subscription' : 'Edit subscription'}
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
              <span className="text-[12px] text-text-muted">Service name</span>
              <input className={fieldClass} value={merchant} placeholder="e.g. Netflix"
                onChange={(e) => setMerchant(e.target.value)} />
            </label>

            <div>
              <span className="text-[12px] text-text-muted">Amount</span>
              <div className="mt-1 flex items-end gap-2 border-b-2 border-default py-1.5 focus-within:border-accent">
                <span className="text-[24px] font-medium leading-none text-text-muted">€</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="w-full border-0 bg-transparent p-0 text-[32px] font-bold leading-none text-text-primary outline-none placeholder:text-text-muted"
                />
              </div>
            </div>

            <div>
              <span className="text-[12px] text-text-muted">Billing frequency</span>
              <div className="mt-1.5 flex gap-2">
                {(['monthly', 'yearly'] as SubFrequency[]).map((f) => {
                  const active = frequency === f
                  return (
                    <button
                      key={f}
                      onClick={() => setFrequency(f)}
                      className={cn(
                        'h-9 rounded-full px-3 text-[13px] font-medium capitalize',
                        active ? 'text-white' : 'border border-default text-text-secondary hover:text-text-primary'
                      )}
                      style={active ? { backgroundColor: 'var(--color-accent)' } : undefined}
                    >
                      {f}
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-muted">Last charged</span>
              <input className={fieldClass} type="date" value={lastCharged}
                onChange={(e) => setLastCharged(e.target.value)} />
            </label>
          </div>
        </div>

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
            Save subscription
          </button>
        </div>
    </Drawer>
  )
}
