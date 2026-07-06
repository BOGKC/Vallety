import { useMemo, useState } from 'react'
import { FileText, Plus, X, Trash2, Send, CheckCircle } from 'lucide-react'
import toast from '../../components/Toast'
import { Drawer } from '../../components/Drawer'
import { EmptyState } from '../../components/EmptyState'
import { formatEuro, parseAmount } from '../../shared/lib/formatters'
import { cn } from '../../shared/lib/cn'
import {
  readInvoices, addInvoice, updateInvoice, deleteInvoice, readClients,
  invoiceGross, invoiceVat, VAT_RATES, type Invoice,
} from '../../shared/lib/business'

const fieldClass =
  'w-full rounded-md border border-default bg-bg-input px-3 h-10 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent'

const STATUS_STYLE: Record<Invoice['status'], { bg: string; color: string; label: string }> = {
  draft: { bg: 'var(--bg-elevated)', color: 'var(--text-muted)', label: 'Draft' },
  sent: { bg: 'var(--color-warning-muted)', color: 'var(--color-warning)', label: 'Sent' },
  paid: { bg: 'var(--color-success-muted)', color: 'var(--color-success)', label: 'Paid' },
}

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(() => readInvoices())
  const [open, setOpen] = useState(false)
  const [client, setClient] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [vatRate, setVatRate] = useState<number>(25.5)
  const [dueDate, setDueDate] = useState('')

  const clients = useMemo(() => readClients(), [])
  const totals = useMemo(() => {
    const paid = invoices.filter((i) => i.status === 'paid').reduce((a, i) => a + invoiceGross(i), 0)
    const outstanding = invoices.filter((i) => i.status === 'sent').reduce((a, i) => a + invoiceGross(i), 0)
    return { paid, outstanding }
  }, [invoices])

  const save = () => {
    const net = parseAmount(amount)
    if (!client.trim() || !Number.isFinite(net) || net <= 0) {
      toast.error('Add a client and a valid amount.')
      return
    }
    setInvoices(addInvoice({
      client: client.trim(),
      description: description.trim() || 'Services',
      amount: net,
      vatRate,
      status: 'draft',
      issuedAt: new Date().toISOString(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
    }))
    toast.success('Invoice created')
    setOpen(false)
    setClient(''); setDescription(''); setAmount(''); setVatRate(25.5); setDueDate('')
  }

  const setStatus = (inv: Invoice, status: Invoice['status']) => {
    setInvoices(updateInvoice(inv.id, {
      status,
      paidAt: status === 'paid' ? new Date().toISOString() : inv.paidAt,
    }))
    if (status === 'paid') toast.success(`${formatEuro(invoiceGross(inv))} marked as paid 🎉`)
  }

  const remove = (inv: Invoice) => {
    setInvoices(deleteInvoice(inv.id))
    toast.success('Invoice deleted')
  }

  const sorted = [...invoices].sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[18px] font-semibold text-text-primary">Invoices</h1>
        <button
          onClick={() => setOpen(true)}
          className="btn-accent inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-white"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <Plus className="h-4 w-4" /> New invoice
        </button>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices yet"
          description="Create your first invoice — paid invoices become business revenue and feed your safe-to-pay-yourself number."
          primaryAction={{ label: 'Create invoice', icon: Plus, onClick: () => setOpen(true) }}
        />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[18px] font-semibold" style={{ color: 'var(--color-success)' }}>{formatEuro(totals.paid)}</p>
              <p className="mt-0.5 text-[12px] text-text-muted">Paid (gross)</p>
            </div>
            <div className="rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[18px] font-semibold" style={{ color: 'var(--color-warning)' }}>{formatEuro(totals.outstanding)}</p>
              <p className="mt-0.5 text-[12px] text-text-muted">Outstanding</p>
            </div>
          </div>

          <div className="stagger-list flex flex-col gap-3">
            {sorted.map((inv) => {
              const st = STATUS_STYLE[inv.status]
              return (
                <div key={inv.id} className="rounded-lg bg-bg-card px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-text-primary">{inv.client}</p>
                      <p className="truncate text-[12px] text-text-muted">
                        {inv.description} · due {new Date(inv.dueDate).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                    <div className="text-right">
                      <p className="text-[14px] font-semibold text-text-primary">{formatEuro(invoiceGross(inv))}</p>
                      <p className="text-[11px] text-text-muted">incl. {formatEuro(invoiceVat(inv))} ALV</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2 border-t border-subtle pt-2.5">
                    {inv.status === 'draft' && (
                      <button onClick={() => setStatus(inv, 'sent')} className="inline-flex h-7 items-center gap-1 rounded-md border border-default px-2 text-[12px] text-text-secondary hover:text-text-primary">
                        <Send className="h-3 w-3" /> Mark sent
                      </button>
                    )}
                    {inv.status !== 'paid' && (
                      <button onClick={() => setStatus(inv, 'paid')} className="inline-flex h-7 items-center gap-1 rounded-md border border-default px-2 text-[12px]" style={{ color: 'var(--color-success)' }}>
                        <CheckCircle className="h-3 w-3" /> Mark paid
                      </button>
                    )}
                    <button onClick={() => remove(inv)} aria-label="Delete invoice" className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-[var(--color-danger)]">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} ariaLabel="New invoice">
        <div className="flex items-center justify-between border-b border-subtle px-5 py-3.5">
          <h2 className="text-[16px] font-semibold text-text-primary">New invoice</h2>
          <button onClick={() => setOpen(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-muted">Client</span>
              <input className={fieldClass} value={client} list="invoice-clients" placeholder="e.g. Acme Oy" onChange={(e) => setClient(e.target.value)} />
              <datalist id="invoice-clients">
                {clients.map((c) => <option key={c.id} value={c.name} />)}
              </datalist>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-muted">Description</span>
              <input className={fieldClass} value={description} placeholder="e.g. Consulting, March" onChange={(e) => setDescription(e.target.value)} />
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
              <span className="text-[12px] text-text-muted">Due date</span>
              <input className={fieldClass} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
            {parseAmount(amount) > 0 && (
              <p className="rounded-md bg-bg-elevated px-3 py-2 text-[13px] text-text-secondary">
                Total incl. ALV: <span className="font-semibold text-text-primary">{formatEuro(parseAmount(amount) * (1 + vatRate / 100))}</span>
              </p>
            )}
          </div>
        </div>
        <div className="border-t border-subtle p-4">
          <button onClick={save} className="btn-accent flex h-11 w-full items-center justify-center rounded-md text-[14px] font-semibold text-white" style={{ backgroundColor: 'var(--color-accent)' }}>
            Create invoice
          </button>
        </div>
      </Drawer>
    </div>
  )
}
