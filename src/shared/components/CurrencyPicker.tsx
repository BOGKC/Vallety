import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'
import { CURRENCIES, getCurrency, groupedCurrencies } from '../../lib/currencies'
import { cn } from '../lib/cn'

interface Props {
  value: string
  onChange: (code: string) => void
  ariaLabel?: string
  /** Full width (settings rows) vs. compact (inline, e.g. account form). */
  className?: string
}

/**
 * Searchable currency dropdown, grouped by region (Eurozone & Nordics first).
 * Region headers are non-selectable labels; type "kro" to filter to
 * SEK/NOK/DKK/ISK across all groups. Each option shows the symbol, code, and
 * name. Built as a small self-contained combobox (no external dependency).
 */
export function CurrencyPicker({ value, onChange, ariaLabel = 'Currency', className }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = getCurrency(value) ?? CURRENCIES[0]
  const regions = groupedCurrencies(query)

  const close = () => { setOpen(false); setQuery('') }

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Focus the search box when the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const choose = (code: string) => {
    onChange(code)
    close()
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className="flex h-9 w-full items-center gap-2 rounded-md border border-default bg-bg-input px-3 text-[13px] text-text-primary focus:border-accent"
      >
        <span className="text-text-muted">{selected.symbol}</span>
        <span className="font-medium">{selected.code}</span>
        <span className="truncate text-text-muted">{selected.name}</span>
        <ChevronDown className="ml-auto h-4 w-4 flex-shrink-0 text-text-muted" />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 max-h-72 w-full min-w-[240px] overflow-hidden rounded-md border border-default bg-bg-elevated shadow-xl"
          role="listbox"
        >
          <div className="flex items-center gap-2 border-b border-subtle px-3 py-2">
            <Search className="h-4 w-4 flex-shrink-0 text-text-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search currency…"
              className="w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {regions.length === 0 && (
              <li className="px-3 py-2 text-[13px] text-text-muted">No match</li>
            )}
            {regions.map((region) => (
              <li key={region.label} role="group" aria-label={region.label}>
                <p className="sticky top-0 bg-bg-elevated px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  {region.label}
                </p>
                <ul>
                  {region.currencies.map((c) => {
                    const active = c.code === selected.code
                    return (
                      <li key={c.code} role="option" aria-selected={active}>
                        <button
                          type="button"
                          onClick={() => choose(c.code)}
                          className={cn(
                            'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-bg-input',
                            active ? 'text-[var(--color-accent)]' : 'text-text-primary',
                          )}
                        >
                          <span className="w-7 flex-shrink-0 text-text-muted">{c.symbol}</span>
                          <span className="w-10 flex-shrink-0 font-medium">{c.code}</span>
                          <span className="truncate text-text-secondary">{c.name}</span>
                          {active && <Check className="ml-auto h-4 w-4 flex-shrink-0" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
