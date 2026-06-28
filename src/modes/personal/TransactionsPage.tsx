import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera, Upload, Plus, Search, ChevronRight, ArrowLeftRight, X, Trash2, SlidersHorizontal,
} from 'lucide-react'
import { Modal } from '../../shared/components/Modal'
import { EmptyState } from '../../components/EmptyState'
import { Drawer } from '../../components/Drawer'
import { AddTransactionDrawer } from './AddTransactionDrawer'
import { CsvImportModal } from './CsvImportModal'
import { formatEuro } from '../../shared/lib/formatters'
import { cn } from '../../shared/lib/cn'
import {
  readTransactions, addTransaction, updateTransaction, deleteTransaction,
  getCategoryMeta, allCategories, hexToRgba, rowTimeLabel, groupByDate,
  applyFilters, filtersAreActive, DEFAULT_FILTERS, PRESET_CATEGORIES,
  type Txn, type TxnType, type Filters, type SortKey, type DatePreset,
} from '../../shared/lib/transactions'

// ── Reusable buttons ────────────────────────────────────────────────────────

function GhostButton({
  children, onClick, className,
}: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-md border border-default px-3 text-[13px] font-medium text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
        className
      )}
      style={{ transition: 'var(--transition-fast)' }}
    >
      {children}
    </button>
  )
}

function AccentButton({
  children, onClick, className, full,
}: { children: React.ReactNode; onClick?: () => void; className?: string; full?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-white',
        full && 'w-full',
        className
      )}
      style={{ backgroundColor: 'var(--color-accent)', transition: 'var(--transition-fast)' }}
    >
      {children}
    </button>
  )
}

// ── Auto-resizing textarea ──────────────────────────────────────────────────

function AutoTextarea({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={2}
      className="w-full resize-none rounded-md border border-default bg-bg-input px-3 py-2 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent"
    />
  )
}

const fieldClass =
  'w-full rounded-md border border-default bg-bg-input px-3 h-9 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent'

// ── Transaction row ─────────────────────────────────────────────────────────

function TransactionRow({ txn, onClick }: { txn: Txn; onClick: () => void }) {
  const meta = getCategoryMeta(txn.category)
  const Icon = meta.icon
  const isIncome = txn.type === 'income'
  return (
    <button
      onClick={onClick}
      className="group flex min-h-[56px] w-full items-center gap-3 px-1 text-left hover:bg-bg-elevated"
      style={{ transition: 'var(--transition-fast)', borderRadius: 'var(--radius-md)' }}
    >
      <span
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: hexToRgba(meta.color, 0.15) }}
      >
        <Icon className="h-4 w-4" style={{ color: meta.color }} />
      </span>

      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[14px] font-medium text-text-primary">{txn.merchant}</span>
        <span
          className="inline-flex w-fit items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: hexToRgba(meta.color, 0.15), color: meta.color }}
        >
          {txn.category}
        </span>
      </span>

      <span className="ml-auto flex items-center gap-2 pl-2">
        <span
          className="text-[15px] font-semibold"
          style={{ color: isIncome ? '#22C55E' : '#EF4444' }}
        >
          {isIncome ? '+' : '-'}{formatEuro(txn.amount)}
        </span>
        <span className="hidden w-12 text-right text-[12px] text-text-muted sm:block">
          {rowTimeLabel(txn.date)}
        </span>
        <ChevronRight className="hidden h-4 w-4 text-text-muted opacity-0 transition-opacity group-hover:opacity-100 sm:block" />
      </span>
    </button>
  )
}

// ── Drawer (add / edit) ─────────────────────────────────────────────────────

interface Draft {
  merchant: string
  amount: string
  type: TxnType
  category: string
  date: string // yyyy-MM-dd
  notes: string
  account: string
}

function blankDraft(): Draft {
  return {
    merchant: '', amount: '', type: 'expense', category: 'Other',
    date: new Date().toISOString().slice(0, 10), notes: '', account: 'Manual entry',
  }
}

function draftFromTxn(t: Txn): Draft {
  return {
    merchant: t.merchant,
    amount: String(t.amount),
    type: t.type,
    category: t.category,
    date: new Date(t.date).toISOString().slice(0, 10),
    notes: t.notes ?? '',
    account: t.account ?? 'Manual entry',
  }
}

function TransactionDrawer({
  open, mode, draft, categories, onChange, onClose, onSave, onDelete,
}: {
  open: boolean
  mode: 'add' | 'edit'
  draft: Draft
  categories: string[]
  onChange: (d: Draft) => void
  onClose: () => void
  onSave: () => void
  onDelete: () => void
}) {
  const amountNum = Number(draft.amount)
  const valid = draft.merchant.trim() !== '' && Number.isFinite(amountNum) && amountNum > 0
  const isIncome = draft.type === 'income'

  return (
    <Drawer open={open} onClose={onClose} ariaLabel={mode === 'add' ? 'New transaction' : 'Transaction'}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-subtle px-5 py-3.5">
          <h2 className="text-[16px] font-semibold text-text-primary">
            {mode === 'add' ? 'New transaction' : 'Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {mode === 'edit' && (
            <div className="mb-5">
              <p className="text-[20px] font-semibold text-text-primary">
                {draft.merchant || 'Untitled'}
              </p>
              <p
                className="mt-1 text-[32px] font-bold leading-none"
                style={{ color: isIncome ? '#22C55E' : '#EF4444' }}
              >
                {isIncome ? '+' : '-'}{formatEuro(amountNum || 0)}
              </p>
              <p className="mt-2 text-[14px] text-text-secondary">
                {new Date(draft.date).toLocaleDateString('en-IE', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-text-muted">Merchant</span>
              <input
                className={fieldClass}
                value={draft.merchant}
                placeholder="e.g. Tesco"
                onChange={(e) => onChange({ ...draft, merchant: e.target.value })}
              />
            </label>

            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-[12px] font-medium text-text-muted">Amount (€)</span>
                <input
                  className={fieldClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.amount}
                  placeholder="0.00"
                  onChange={(e) => onChange({ ...draft, amount: e.target.value })}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-[12px] font-medium text-text-muted">Type</span>
                <select
                  className={fieldClass}
                  value={draft.type}
                  onChange={(e) => onChange({ ...draft, type: e.target.value as TxnType })}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-text-muted">Category</span>
              <select
                className={fieldClass}
                value={draft.category}
                onChange={(e) => onChange({ ...draft, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-text-muted">Date</span>
              <input
                className={fieldClass}
                type="date"
                value={draft.date}
                onChange={(e) => onChange({ ...draft, date: e.target.value })}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-text-muted">Notes</span>
              <AutoTextarea
                value={draft.notes}
                placeholder="Add a note..."
                onChange={(v) => onChange({ ...draft, notes: v })}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-text-muted">Account</span>
              <input
                className={fieldClass}
                value={draft.account}
                onChange={(e) => onChange({ ...draft, account: e.target.value })}
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-subtle px-5 py-4">
          <AccentButton full onClick={onSave} className={cn(!valid && 'opacity-50')}>
            {mode === 'add' ? 'Add transaction' : 'Save changes'}
          </AccentButton>
          {mode === 'edit' && (
            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-1.5 py-1.5 text-[14px] font-medium"
              style={{ color: 'var(--color-danger)' }}
            >
              <Trash2 className="h-4 w-4" />
              Delete transaction
            </button>
          )}
        </div>
    </Drawer>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date-newest', label: 'Date (newest)' },
  { value: 'date-oldest', label: 'Date (oldest)' },
  { value: 'amount-high', label: 'Amount (high-low)' },
  { value: 'amount-low', label: 'Amount (low-high)' },
  { value: 'merchant-az', label: 'Merchant (A-Z)' },
]

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'last-3-months', label: 'Last 3 months' },
  { value: 'all-time', label: 'All time' },
]

const TYPE_PILLS: { value: 'all' | TxnType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
]

export function TransactionsPage() {
  const [txns, setTxns] = useState<Txn[]>(() => readTransactions())
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [modal, setModal] = useState<'receipt' | 'csv' | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('edit')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(blankDraft())

  const now = useMemo(() => new Date(), [])
  const categoryOptions = useMemo(() => allCategories(txns), [txns])
  const filtered = useMemo(() => applyFilters(txns, filters, now), [txns, filters, now])
  const groups = useMemo(() => groupByDate(filtered, filters.sort), [filtered, filters.sort])

  const hasAny = txns.length > 0
  const hasResults = filtered.length > 0

  // Drawer controls
  const openAdd = () => setAddOpen(true)
  const openEdit = (t: Txn) => {
    setDrawerMode('edit'); setEditingId(t.id); setDraft(draftFromTxn(t)); setDrawerOpen(true)
  }
  const closeDrawer = () => setDrawerOpen(false)

  const saveDraft = () => {
    const amount = Number(draft.amount)
    if (!draft.merchant.trim() || !Number.isFinite(amount) || amount <= 0) return
    const payload = {
      type: draft.type,
      amount,
      merchant: draft.merchant.trim(),
      category: draft.category,
      date: new Date(draft.date).toISOString(),
      notes: draft.notes.trim() || undefined,
      account: draft.account.trim() || 'Manual entry',
    }
    setTxns(editingId ? updateTransaction(editingId, payload) : addTransaction(payload))
    setDrawerOpen(false)
  }

  const removeDraft = () => {
    if (editingId) setTxns(deleteTransaction(editingId))
    setDrawerOpen(false)
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* HEADER */}
      <header className="sticky top-0 z-30 -mx-6 -mt-6 flex h-14 items-center justify-between gap-3 border-b border-subtle bg-bg-primary px-6">
        <h1 className="text-[18px] font-semibold text-text-primary">Transactions</h1>
        <div className="flex items-center gap-2">
          <GhostButton onClick={() => setModal('receipt')} className="hidden sm:inline-flex">
            <Camera className="h-4 w-4" /> Scan receipt
          </GhostButton>
          <GhostButton onClick={() => setModal('csv')} className="hidden sm:inline-flex">
            <Upload className="h-4 w-4" /> Import CSV
          </GhostButton>
          <AccentButton onClick={openAdd}>
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New transaction</span>
            <span className="sm:hidden">New</span>
          </AccentButton>
        </div>
      </header>

      {/* FILTER BAR */}
      <div className="sticky top-14 z-20 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-subtle bg-bg-secondary px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search transactions..."
              className="h-9 w-[220px] max-w-full rounded-md border border-default bg-bg-input pl-8 pr-3 text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent"
            />
          </div>

          <select
            value={filters.category}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
            className="hidden h-9 rounded-md border border-default bg-bg-input px-2 text-[13px] text-text-primary focus:border-accent sm:block"
          >
            <option value="all">All categories</option>
            {Array.from(new Set([...PRESET_CATEGORIES, ...categoryOptions])).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={filters.datePreset}
            onChange={(e) => setFilters((f) => ({ ...f, datePreset: e.target.value as DatePreset }))}
            className="hidden h-9 rounded-md border border-default bg-bg-input px-2 text-[13px] text-text-primary focus:border-accent sm:block"
          >
            {DATE_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md bg-bg-input p-1">
            {TYPE_PILLS.map((p) => (
              <button
                key={p.value}
                onClick={() => setFilters((f) => ({ ...f, type: p.value }))}
                className={cn(
                  'rounded px-2.5 py-1 text-[12px] font-medium',
                  filters.type === p.value ? 'text-white' : 'text-text-secondary hover:text-text-primary'
                )}
                style={
                  filters.type === p.value
                    ? { backgroundColor: 'var(--color-accent)', transition: 'var(--transition-fast)' }
                    : { transition: 'var(--transition-fast)' }
                }
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setFiltersOpen(true)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-default text-text-secondary hover:text-text-primary sm:hidden"
            aria-label="Filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          <select
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as SortKey }))}
            className="hidden h-9 rounded-md border border-default bg-bg-input px-2 text-[13px] text-text-primary focus:border-accent sm:block"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* BODY */}
      <div className="py-4">
        {!hasAny ? (
          // Condition 1: no data at all
          <EmptyState
            icon={ArrowLeftRight}
            title="No transactions yet"
            description="Add one manually, import a bank CSV, or scan a receipt to get started."
            primaryAction={{ label: 'Add transaction', icon: Plus, onClick: openAdd }}
            secondaryAction={{ label: 'Import CSV', onClick: () => setModal('csv') }}
          />
        ) : !hasResults ? (
          // Condition 2: data exists but filters exclude everything
          <EmptyState
            icon={Search}
            title="No transactions match your filters"
            description="Try adjusting your search or filters to find what you're looking for."
            primaryAction={{ label: 'Clear filters', onClick: () => setFilters(DEFAULT_FILTERS) }}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <div key={group.key}>
                <div className="sticky top-[7.5rem] z-10 border-b border-subtle bg-bg-primary px-1 pb-1 pt-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                    {group.label}
                  </span>
                </div>
                <div className="flex flex-col">
                  {group.items.map((t) => (
                    <TransactionRow key={t.id} txn={t} onClick={() => openEdit(t)} />
                  ))}
                </div>
              </div>
            ))}
            {filtersAreActive(filters) && (
              <div className="pt-2 text-center">
                <GhostButton onClick={() => setFilters(DEFAULT_FILTERS)}>Clear filters</GhostButton>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS */}
      <Modal
        open={modal === 'receipt'}
        onClose={() => setModal(null)}
        title="Scan Receipt"
        footer={
          <>
            <GhostButton onClick={() => setModal(null)}>Close</GhostButton>
            <AccentButton onClick={() => { setModal(null); openAdd() }}>Add manually</AccentButton>
          </>
        }
      >
        Receipt scanning is coming soon. Use Import CSV or add manually in the meantime.
      </Modal>

      <CsvImportModal
        open={modal === 'csv'}
        onClose={() => setModal(null)}
        onImported={setTxns}
      />

      {/* Mobile filters sheet */}
      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        footer={<GhostButton onClick={() => setFiltersOpen(false)}>Done</GhostButton>}
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] text-text-muted">Category</span>
            <select
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              className={fieldClass}
            >
              <option value="all">All categories</option>
              {Array.from(new Set([...PRESET_CATEGORIES, ...categoryOptions])).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] text-text-muted">Date range</span>
            <select
              value={filters.datePreset}
              onChange={(e) => setFilters((f) => ({ ...f, datePreset: e.target.value as DatePreset }))}
              className={fieldClass}
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] text-text-muted">Sort by</span>
            <select
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as SortKey }))}
              className={fieldClass}
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>
      </Modal>

      {/* ADD DRAWER (2-step) */}
      <AddTransactionDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={setTxns}
      />

      {/* EDIT DRAWER */}
      <TransactionDrawer
        open={drawerOpen}
        mode={drawerMode}
        draft={draft}
        categories={Array.from(new Set([...PRESET_CATEGORIES, ...categoryOptions]))}
        onChange={setDraft}
        onClose={closeDrawer}
        onSave={saveDraft}
        onDelete={removeDraft}
      />
    </div>
  )
}
