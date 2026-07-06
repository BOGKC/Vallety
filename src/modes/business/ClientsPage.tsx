import { useState } from 'react'
import { Users, Plus, Trash2 } from 'lucide-react'
import toast from '../../components/Toast'
import { EmptyState } from '../../components/EmptyState'
import { readClients, addClient, deleteClient, readInvoices, invoiceGross, type Client } from '../../shared/lib/business'
import { formatEuro } from '../../shared/lib/formatters'

const fieldClass =
  'h-10 rounded-md border border-default bg-bg-input px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent'

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(() => readClients())
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [invoices] = useState(() => readInvoices())

  const billedFor = (clientName: string) =>
    invoices
      .filter((i) => i.client.toLowerCase() === clientName.toLowerCase() && i.status === 'paid')
      .reduce((a, i) => a + invoiceGross(i), 0)

  const save = () => {
    if (!name.trim()) { toast.error('Enter a client name.'); return }
    setClients(addClient({ name: name.trim(), email: email.trim() || undefined }))
    toast.success('Client added')
    setName(''); setEmail(''); setAdding(false)
  }

  const remove = (c: Client) => {
    setClients(deleteClient(c.id))
    toast.success('Client removed')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[18px] font-semibold text-text-primary">Clients</h1>
        <button
          onClick={() => setAdding((v) => !v)}
          className="btn-accent inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-white"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <Plus className="h-4 w-4" /> Add client
        </button>
      </div>

      {adding && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-default bg-bg-card p-4">
          <input className={fieldClass} value={name} placeholder="Client name" onChange={(e) => setName(e.target.value)} />
          <input className={fieldClass} type="email" value={email} placeholder="Email (optional)" onChange={(e) => setEmail(e.target.value)} />
          <button onClick={save} className="btn-accent inline-flex h-10 items-center rounded-md px-3 text-[13px] font-semibold text-white" style={{ backgroundColor: 'var(--color-accent)' }}>
            Save
          </button>
        </div>
      )}

      {clients.length === 0 && !adding ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add the people and companies you invoice — Vallety shows how much each has paid you."
          primaryAction={{ label: 'Add a client', icon: Plus, onClick: () => setAdding(true) }}
        />
      ) : (
        <div className="stagger-list flex flex-col gap-3">
          {clients.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-lg bg-bg-card px-4 py-3.5">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white" style={{ backgroundColor: 'var(--color-accent)' }}>
                {c.name[0]?.toUpperCase() ?? '?'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-text-primary">{c.name}</p>
                {c.email && <p className="truncate text-[12px] text-text-muted">{c.email}</p>}
              </div>
              <span className="text-[13px] text-text-secondary">{formatEuro(billedFor(c.name))} paid</span>
              <button onClick={() => remove(c)} aria-label={`Remove ${c.name}`} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-[var(--color-danger)]">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
