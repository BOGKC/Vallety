import { useState } from 'react'
import { Eye, Plus, Trash2 } from 'lucide-react'
import toast from '../../components/Toast'
import { EmptyState } from '../../components/EmptyState'
import { readWatchlist, addWatchItem, deleteWatchItem, type WatchItem } from '../../shared/lib/portfolio'

const fieldClass =
  'h-10 rounded-md border border-default bg-bg-input px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent'

export function WatchlistPage() {
  const [items, setItems] = useState<WatchItem[]>(() => readWatchlist())
  const [adding, setAdding] = useState(false)
  const [ticker, setTicker] = useState('')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')

  const save = () => {
    if (!ticker.trim()) { toast.error('Enter a ticker.'); return }
    setItems(addWatchItem({
      ticker: ticker.trim().toUpperCase(),
      name: name.trim() || ticker.trim().toUpperCase(),
      note: note.trim() || undefined,
    }))
    toast.success('Added to watchlist')
    setTicker(''); setName(''); setNote(''); setAdding(false)
  }

  const remove = (w: WatchItem) => {
    setItems(deleteWatchItem(w.id))
    toast.success('Removed from watchlist')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[18px] font-semibold text-text-primary">Watchlist</h1>
        <button
          onClick={() => setAdding((v) => !v)}
          className="btn-accent inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-white"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <Plus className="h-4 w-4" /> Add to watchlist
        </button>
      </div>

      {adding && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-default bg-bg-card p-4">
          <input className={fieldClass} value={ticker} placeholder="Ticker" style={{ width: 110 }} onChange={(e) => setTicker(e.target.value)} />
          <input className={fieldClass} value={name} placeholder="Name (optional)" onChange={(e) => setName(e.target.value)} />
          <input className={fieldClass} value={note} placeholder="Note, e.g. buy under €80" onChange={(e) => setNote(e.target.value)} />
          <button onClick={save} className="btn-accent inline-flex h-10 items-center rounded-md px-3 text-[13px] font-semibold text-white" style={{ backgroundColor: 'var(--color-accent)' }}>
            Save
          </button>
        </div>
      )}

      {items.length === 0 && !adding ? (
        <EmptyState
          icon={Eye}
          title="Nothing on your watchlist"
          description="Keep a list of securities you're following, with a note on why or at what price you'd act."
          primaryAction={{ label: 'Add your first', icon: Plus, onClick: () => setAdding(true) }}
        />
      ) : (
        <div className="stagger-list flex flex-col gap-3">
          {items.map((w) => (
            <div key={w.id} className="flex items-center gap-3 rounded-lg bg-bg-card px-4 py-3.5">
              <span className="flex h-9 w-12 flex-shrink-0 items-center justify-center rounded-md bg-bg-elevated text-[12px] font-bold text-text-primary">
                {w.ticker.slice(0, 5)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-text-primary">{w.name}</p>
                {w.note && <p className="truncate text-[12px] text-text-muted">{w.note}</p>}
              </div>
              <button onClick={() => remove(w)} aria-label={`Remove ${w.ticker}`} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-[var(--color-danger)]">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
