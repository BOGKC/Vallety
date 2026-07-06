import { useMemo, useState } from 'react'
import { PieChart, Plus, X, Trash2, Pencil } from 'lucide-react'
import toast from '../../components/Toast'
import { Drawer } from '../../components/Drawer'
import { EmptyState } from '../../components/EmptyState'
import { formatEuro, parseAmount } from '../../shared/lib/formatters'
import { cn } from '../../shared/lib/cn'
import {
  readHoldings, addHolding, updateHolding, deleteHolding, computePortfolio,
  holdingValue, holdingGain, holdingGainPct, HOLDING_TYPES,
  type Holding, type HoldingType,
} from '../../shared/lib/portfolio'

const fieldClass =
  'w-full rounded-md border border-default bg-bg-input px-3 h-10 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent'

export function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>(() => readHoldings())
  const [drawer, setDrawer] = useState<{ open: boolean; editing: Holding | null }>({ open: false, editing: null })
  const [ticker, setTicker] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<HoldingType>('stock')
  const [quantity, setQuantity] = useState('')
  const [avgCost, setAvgCost] = useState('')
  const [currentPrice, setCurrentPrice] = useState('')
  const [dividends, setDividends] = useState('')

  const s = useMemo(() => computePortfolio(holdings), [holdings])

  const openAdd = () => {
    setTicker(''); setName(''); setType('stock'); setQuantity(''); setAvgCost(''); setCurrentPrice(''); setDividends('')
    setDrawer({ open: true, editing: null })
  }
  const openEdit = (h: Holding) => {
    setTicker(h.ticker); setName(h.name); setType(h.type)
    setQuantity(String(h.quantity)); setAvgCost(String(h.avgCost)); setCurrentPrice(String(h.currentPrice))
    setDividends(h.dividendsYtd ? String(h.dividendsYtd) : '')
    setDrawer({ open: true, editing: h })
  }

  const save = () => {
    const qty = parseAmount(quantity)
    const cost = parseAmount(avgCost)
    const price = parseAmount(currentPrice)
    if (!ticker.trim() || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(cost) || cost < 0 || !Number.isFinite(price) || price < 0) {
      toast.error('Fill in ticker, quantity, cost and price.')
      return
    }
    const payload = {
      ticker: ticker.trim().toUpperCase(),
      name: name.trim() || ticker.trim().toUpperCase(),
      type,
      quantity: qty,
      avgCost: cost,
      currentPrice: price,
      dividendsYtd: parseAmount(dividends) > 0 ? parseAmount(dividends) : undefined,
    }
    if (drawer.editing) {
      setHoldings(updateHolding(drawer.editing.id, payload))
      toast.success('Holding updated')
    } else {
      setHoldings(addHolding(payload))
      toast.success('Holding added')
    }
    setDrawer({ open: false, editing: null })
  }

  const remove = () => {
    if (!drawer.editing) return
    setHoldings(deleteHolding(drawer.editing.id))
    toast.success('Holding removed')
    setDrawer({ open: false, editing: null })
  }

  const sorted = [...holdings].sort((a, b) => holdingValue(b) - holdingValue(a))

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[18px] font-semibold text-text-primary">Portfolio</h1>
        <button
          onClick={openAdd}
          className="btn-accent inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-white"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <Plus className="h-4 w-4" /> Add holding
        </button>
      </div>

      {holdings.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title="No holdings yet"
          description="Add each position with its quantity, average cost, and current price. Update prices whenever you like — Vallety tracks the change."
          primaryAction={{ label: 'Add a holding', icon: Plus, onClick: openAdd }}
        />
      ) : (
        <>
          {/* Analytics strip */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[18px] font-semibold text-text-primary">{formatEuro(s.totalValue)}</p>
              <p className="mt-0.5 text-[12px] text-text-muted">Total value</p>
            </div>
            <div className="rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[18px] font-semibold" style={{ color: s.gain >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {s.gain >= 0 ? '+' : ''}{formatEuro(s.gain)}
              </p>
              <p className="mt-0.5 text-[12px] text-text-muted">Total gain ({s.gainPct.toFixed(1)}%)</p>
            </div>
            <div className="rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[18px] font-semibold" style={{ color: 'var(--color-success)' }}>{formatEuro(s.dividendsYtd)}</p>
              <p className="mt-0.5 text-[12px] text-text-muted">Dividends YTD</p>
            </div>
            <div className="rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[18px] font-semibold text-text-primary">{holdings.length}</p>
              <p className="mt-0.5 text-[12px] text-text-muted">Positions</p>
            </div>
          </div>

          {/* Holdings list */}
          <div className="stagger-list flex flex-col gap-3">
            {sorted.map((h) => {
              const pct = holdingGainPct(h)
              const gc = pct >= 0 ? '#22C55E' : '#EF4444'
              const share = s.totalValue > 0 ? (holdingValue(h) / s.totalValue) * 100 : 0
              return (
                <div key={h.id} className="group flex items-center gap-3 rounded-lg bg-bg-card px-4 py-3.5">
                  <span className="flex h-9 w-12 flex-shrink-0 items-center justify-center rounded-md bg-bg-elevated text-[12px] font-bold text-text-primary">
                    {h.ticker.slice(0, 5)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-text-primary">{h.name}</p>
                    <p className="text-[12px] text-text-muted">
                      {h.quantity} × {formatEuro(h.currentPrice, 2)} · {Math.round(share)}% of portfolio
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-semibold text-text-primary">{formatEuro(holdingValue(h))}</p>
                    <p className="text-[12px] font-medium" style={{ color: gc }}>
                      {pct >= 0 ? '+' : ''}{formatEuro(holdingGain(h))} ({pct.toFixed(1)}%)
                    </p>
                  </div>
                  <button
                    onClick={() => openEdit(h)}
                    aria-label={`Edit ${h.ticker}`}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-text-muted opacity-0 transition-opacity hover:bg-bg-elevated hover:text-text-primary group-hover:opacity-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      <Drawer open={drawer.open} onClose={() => setDrawer({ open: false, editing: null })} ariaLabel={drawer.editing ? 'Edit holding' : 'Add holding'}>
        <div className="flex items-center justify-between border-b border-subtle px-5 py-3.5">
          <h2 className="text-[16px] font-semibold text-text-primary">{drawer.editing ? 'Edit holding' : 'Add holding'}</h2>
          <button onClick={() => setDrawer({ open: false, editing: null })} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <label className="flex w-28 flex-col gap-1.5">
                <span className="text-[12px] text-text-muted">Ticker</span>
                <input className={fieldClass} value={ticker} placeholder="NOKIA" onChange={(e) => setTicker(e.target.value)} />
              </label>
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-[12px] text-text-muted">Name</span>
                <input className={fieldClass} value={name} placeholder="Nokia Oyj" onChange={(e) => setName(e.target.value)} />
              </label>
            </div>
            <div>
              <span className="text-[12px] text-text-muted">Type</span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {HOLDING_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={cn('h-9 rounded-full px-3 text-[13px] font-medium', type === t.value ? 'text-white' : 'border border-default text-text-secondary hover:text-text-primary')}
                    style={type === t.value ? { backgroundColor: 'var(--color-accent)' } : undefined}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-[12px] text-text-muted">Quantity</span>
                <input className={fieldClass} value={quantity} inputMode="decimal" placeholder="0" onChange={(e) => setQuantity(e.target.value)} />
              </label>
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-[12px] text-text-muted">Avg cost / unit (€)</span>
                <input className={fieldClass} value={avgCost} inputMode="decimal" placeholder="0.00" onChange={(e) => setAvgCost(e.target.value)} />
              </label>
            </div>
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-[12px] text-text-muted">Current price / unit (€)</span>
                <input className={fieldClass} value={currentPrice} inputMode="decimal" placeholder="0.00" onChange={(e) => setCurrentPrice(e.target.value)} />
              </label>
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-[12px] text-text-muted">Dividends YTD (€)</span>
                <input className={fieldClass} value={dividends} inputMode="decimal" placeholder="0.00" onChange={(e) => setDividends(e.target.value)} />
              </label>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-subtle p-4">
          <button onClick={save} className="btn-accent flex h-11 w-full items-center justify-center rounded-md text-[14px] font-semibold text-white" style={{ backgroundColor: 'var(--color-accent)' }}>
            {drawer.editing ? 'Save changes' : 'Add holding'}
          </button>
          {drawer.editing && (
            <button onClick={remove} className="flex items-center justify-center gap-1.5 py-1.5 text-[14px] font-medium" style={{ color: 'var(--color-danger)' }}>
              <Trash2 className="h-4 w-4" /> Remove holding
            </button>
          )}
        </div>
      </Drawer>
    </div>
  )
}
