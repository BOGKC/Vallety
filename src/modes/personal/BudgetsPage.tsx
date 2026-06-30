import { useEffect, useState } from 'react'
import { cn } from '../../shared/lib/cn'
import { BudgetsTab } from './BudgetsTab'
import { GoalsTab } from './GoalsTab'
import { DebtTab } from './DebtTab'

type Tab = 'budgets' | 'goals' | 'debt'

const TABS: { value: Tab; label: string }[] = [
  { value: 'budgets', label: 'Budgets' },
  { value: 'goals', label: 'Goals' },
  { value: 'debt', label: 'Debt' },
]

function hashToTab(hash: string): Tab {
  const h = hash.replace('#', '')
  return h === 'goals' || h === 'debt' ? h : 'budgets'
}

export function BudgetsPage() {
  const [tab, setTab] = useState<Tab>(() => hashToTab(window.location.hash))

  // Keep tab in sync with browser back/forward hash changes.
  useEffect(() => {
    const onHash = () => setTab(hashToTab(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const selectTab = (t: Tab) => {
    setTab(t)
    window.history.replaceState(null, '', `#${t}`)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="sr-only">Budgets</h1>
      {/* Tab bar */}
      <div className="mb-5 inline-flex items-center gap-1 rounded-full bg-bg-elevated p-1">
        {TABS.map((t) => {
          const active = tab === t.value
          return (
            <button
              key={t.value}
              onClick={() => selectTab(t.value)}
              className={cn(
                'h-9 rounded-full px-4 text-[13px] font-medium',
                active ? 'text-white' : 'text-text-muted hover:text-text-secondary'
              )}
              style={active ? { backgroundColor: 'var(--color-accent)', transition: 'var(--transition-fast)' } : { transition: 'var(--transition-fast)' }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'budgets' && <BudgetsTab />}
      {tab === 'goals' && <GoalsTab />}
      {tab === 'debt' && <DebtTab />}
    </div>
  )
}
