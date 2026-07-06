import { useMemo, useState } from 'react'
import { Receipt, Plus, X, Trash2 } from 'lucide-react'
import toast from '../../components/Toast'
import { Drawer } from '../../components/Drawer'
import { EmptyState } from '../../components/EmptyState'
import { formatEuro, parseAmount } from '../../shared/lib/formatters'
import { cn } from '../../shared/lib/cn'
import {
  readExpenses, addExpense, deleteExpense, EXPENSE_CATEGORIES, VAT_RATES,
  type BusinessExpense,
} from '../../shared/lib/business'

const fieldClass =
  'w-full rounded-md border border-default bg-bg-input px-3 h-10 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent'

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<BusinessExpense[]>(() => readExpenses())
  const [open, setOpen] = useState(false)
  const [vendor, setVendor] = useState('')
  const [amount, setAmount] = useState('')
  const [vatRate, setVatRate] = useState<number>(25.5)
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [date, setDate] = useState('')

  const totals = useMemo(() => {
    const net = expenses.reduce((a, e) => a + e.amount, 0)
    const vat = expenses.reduce((a, e) => a + e.amount * (e.vatRate / 100), 0)
    return { net, vat }
  }, [expenses])

  const save = () => {
    const net = parseAmount(amount)
    if (!vendor.trim() || !Number.isFinite(net) || net <= 0) {
      toast.error('Add a vendor and a valid amount.')
      return
    }
    setExpenses(addExpense({
      vendor: vendor.trim(),
      amount: net,
      vatRate,
      category,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
    }))
    toast.success('Expense logged')
    setOpen(false)
    setVendor(''); setAmount(''); setVatRate(25.5); setCategory(EXPENSE_CATEGORIES[0]); setDate('')
  }

  const remove = (e: BusinessExpense) => {
    setExpenses(deleteExpense(e.id))
    toast.success('Expense deleted')
  }

  const sorted = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[18px] font-semibold text-text-primary">Expenses</h1>
        <button
          onClick={() => setOpen(true)}
          className="btn-accent inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-white"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <Plus className="h-4 w-4" /> Log expense
        </button>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No business expenses yet"
          description="Log deductible expenses — they reduce your taxable profit, and their ALV is deducted from what you owe Vero."
          primaryAction={{ label: 'Log an expense', icon: Plus, onClick: () => setOpen(true) }}
        />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[18px] font-semibold text-text-primary">{formatEuro(totals.net)}</p>
              <p className="mt-0.5 text-[12px] text-text-muted">Total (net)</p>
            </div>
            <div className="rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[18px] font-semibold" style={{ color: 'var(--color-success)' }}>{formatEuro(totals.vat)}</p>
              <p className="mt-0.5 text-[12px] text-text-muted">Deductible ALV</p>
            </div>
          </div>

          <div className="stagger-list flex flex-col gap-3">
            {sorted.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-lg bg-bg-card px-4 py-3.5">
                <Receipt className="h-4 w-4 flex-shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-text-primary">{e.vendor}</p>
                  <p className="text-[12px] text-text-muted">
                    {e.category} · {new Date(e.date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })} · ALV {e.vatRate}%
                  </p>
                </div>
                <span className="text-[14px] font-semibold text-text-primary">{formatEuro(e.amount)}</span>
                <button onClick={() => remove(e)} aria-label={`Delete ${e.vendor}`} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-[var(--color-danger)]">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} ariaLabel="Log expense">
        <div className="flex items-center justify-between border-b border-subtle px-5 py-3.5">
          <h2 className="text-[16px] font-semibold text-text-primary">Log expense</h2>
          <button onClick={() => setOpen(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-muted">Vendor</span>
              <input className={fieldClass} value={vendor} placeholder="e.g. Verkkokauppa.com" onChange={(e) => setVendor(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-muted">Amount excl. ALV (€)</span>
              <input className={fieldClass} value={amount} inputMode="decimal" placeholder="0.00" onChange={(e) => setAmount(e.target.value)} />
            </label>
            <div>
              <span className="text-[12px] text-text-muted">ALV rate</span>
              <div className="mt-1.5 flex gap-2">
                {VAT_RATES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setVatRate(r)}
                    className={cn('h-9 rounded-full px-3 text-[13px] font-medium', vatRate === r ? 'text-white' : 'border border-default text-text-secondary hover:text-text-primary')}
                    style={vatRate === r ? { backgroundColor: 'var(--color-accent)' } : undefined}
                  >
                    {r}%
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-muted">Category</span>
              <select className={fieldClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-muted">Date</span>
              <input className={fieldClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>
        </div>
        <div className="border-t border-subtle p-4">
          <button onClick={save} className="btn-accent flex h-11 w-full items-center justify-center rounded-md text-[14px] font-semibold text-white" style={{ backgroundColor: 'var(--color-accent)' }}>
            Save expense
          </button>
        </div>
      </Drawer>
    </div>
  )
}
