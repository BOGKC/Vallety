import { useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  Plus, TrendingUp, Landmark, Pencil, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { formatEuro } from '../../shared/lib/formatters'
import {
  readAccounts, ensureMonthlySnapshot, computeTotals, monthlyDelta,
  ACCOUNT_ICONS, accountTypeLabel, isLiability,
  type Account, type Snapshot,
} from '../../shared/lib/netWorth'
import { AccountDrawer } from './AccountDrawer'
import { EmptyState } from '../../components/EmptyState'
import { AnimatedEuro } from '../../components/AnimatedNumber'

interface ChartTooltipProps {
  active?: boolean
  payload?: { payload: { net: number; date: string } }[]
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  return (
    <div className="rounded-md border border-default bg-bg-elevated px-3 py-2 shadow-lg">
      <p className="text-[11px] text-text-muted">
        {new Date(point.date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
      <p className="text-[13px] font-medium text-text-primary">Net worth: {formatEuro(point.net)}</p>
    </div>
  )
}

function AccountRow({
  account, onEdit,
}: { account: Account; onEdit: () => void }) {
  const Icon = ACCOUNT_ICONS[account.type]
  const liability = isLiability(account.type)
  return (
    <div className="group flex items-center gap-3 rounded-lg bg-bg-card px-4 py-3">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-bg-elevated">
        <Icon className="h-4 w-4 text-text-secondary" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-text-primary">{account.name}</p>
        <span className="text-[12px] text-text-muted">
          {account.institution || accountTypeLabel(account.type)}
        </span>
      </div>
      <span
        className="flex-shrink-0 text-[14px] font-semibold"
        style={{ color: liability ? 'var(--color-danger)' : 'var(--color-success)' }}
      >
        {formatEuro(account.balance)}
      </span>
      <button
        onClick={onEdit}
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-text-muted opacity-0 transition-opacity hover:bg-bg-elevated hover:text-text-primary group-hover:opacity-100"
        aria-label={`Edit ${account.name}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function NetWorthPage() {
  const [accounts, setAccounts] = useState<Account[]>(() => readAccounts())
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => ensureMonthlySnapshot())
  const [drawer, setDrawer] = useState<{ open: boolean; mode: 'add' | 'edit'; account: Account | null }>({
    open: false, mode: 'add', account: null,
  })

  const now = useMemo(() => new Date(), [])
  const totals = useMemo(() => computeTotals(accounts), [accounts])
  const delta = useMemo(() => monthlyDelta(totals.net, snapshots, now), [totals.net, snapshots, now])

  const hasAccounts = accounts.length > 0
  const assets = accounts.filter((a) => !isLiability(a.type))
  const liabilities = accounts.filter((a) => isLiability(a.type))

  const chartData = useMemo(
    () => snapshots.map((s) => ({ label: format(new Date(s.date), 'MMM'), net: s.netWorth, date: s.date })),
    [snapshots]
  )
  const hasNegative = snapshots.some((s) => s.netWorth < 0)

  const heroColor =
    !hasAccounts || totals.net === 0
      ? 'var(--text-muted)'
      : totals.net > 0 ? '#22C55E' : '#EF4444'
  const heroIsEmpty = !hasAccounts || totals.net === 0

  const onAccountsSaved = (list: Account[]) => {
    setAccounts(list)
    setSnapshots(ensureMonthlySnapshot())
  }
  const openAdd = () => setDrawer({ open: true, mode: 'add', account: null })
  const openEdit = (a: Account) => setDrawer({ open: true, mode: 'edit', account: a })

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[18px] font-semibold text-text-primary">Net worth</h1>
        <button
          onClick={openAdd}
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-white"
          style={{ backgroundColor: 'var(--color-accent)', transition: 'var(--transition-fast)' }}
        >
          <Plus className="h-4 w-4" /> Add account
        </button>
      </div>

      {!hasAccounts ? (
        <EmptyState
          icon={Landmark}
          title="No accounts tracked"
          description="Add your bank accounts, investments, and loans to see your complete financial picture."
          primaryAction={{ label: 'Add account', icon: Plus, onClick: openAdd }}
        />
      ) : (
        <>
          {/* Hero */}
          <div className="rounded-lg border border-default bg-bg-card p-6 text-center">
            <p className="text-[12px] font-medium uppercase text-text-muted" style={{ letterSpacing: '0.08em' }}>
              Total net worth
            </p>
            <p className="mt-1 text-[44px] font-bold leading-none" style={{ color: heroColor }}>
              {heroIsEmpty ? '€—' : <AnimatedEuro value={totals.net} />}
            </p>
            {delta !== null && (
              <div
                className="mt-2 inline-flex items-center gap-1 text-[13px]"
                style={{ color: delta >= 0 ? '#22C55E' : '#EF4444' }}
              >
                {delta >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {delta >= 0 ? '+' : '-'}{formatEuro(Math.abs(delta))} this month
              </div>
            )}
          </div>

          {/* Summary cards */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[18px] font-semibold" style={{ color: 'var(--color-success)' }}>
                {formatEuro(totals.assets)}
              </p>
              <p className="mt-0.5 text-[12px] text-text-muted">Total assets</p>
            </div>
            <div className="rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[18px] font-semibold" style={{ color: 'var(--color-danger)' }}>
                {formatEuro(totals.liabilities)}
              </p>
              <p className="mt-0.5 text-[12px] text-text-muted">Total liabilities</p>
            </div>
            <div className="rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[18px] font-semibold text-text-primary">{totals.count}</p>
              <p className="mt-0.5 text-[12px] text-text-muted">Accounts tracked</p>
            </div>
          </div>

          {/* Chart / empty state */}
          <div className="mt-5 rounded-lg border border-default bg-bg-card p-5">
            {snapshots.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <TrendingUp className="h-9 w-9 text-text-muted" />
                <p className="max-w-xs text-[13px] text-text-secondary">
                  Add an account to start tracking your net worth over time.
                </p>
              </div>
            ) : (
              <>
                <div className="h-40 w-full sm:h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
                    <defs>
                      <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(59,91,219,0.3)" />
                        <stop offset="100%" stopColor="rgba(59,91,219,0.02)" />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label" axisLine={false} tickLine={false}
                      tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    />
                    <YAxis hide />
                    {hasNegative && <ReferenceLine y={0} stroke="var(--border-default)" strokeDasharray="4 4" />}
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-default)' }} />
                    <Area
                      type="monotone" dataKey="net" stroke="var(--color-accent)"
                      strokeWidth={2} fill="url(#nwFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                </div>
                <p className="mt-2 text-[11px] text-text-muted">
                  Tracking since {format(new Date(snapshots[0].date), 'MMM yyyy')}
                </p>
              </>
            )}
          </div>

          {/* Assets */}
          {assets.length > 0 && (
            <section className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-text-primary">Assets</h2>
                <span className="text-[14px] font-semibold" style={{ color: 'var(--color-success)' }}>
                  {formatEuro(totals.assets)}
                </span>
              </div>
              <div className="stagger-list flex flex-col gap-2">
                {assets.map((a) => <AccountRow key={a.id} account={a} onEdit={() => openEdit(a)} />)}
              </div>
            </section>
          )}

          {/* Liabilities */}
          {liabilities.length > 0 && (
            <section className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-text-primary">Liabilities</h2>
                <span className="text-[14px] font-semibold" style={{ color: 'var(--color-danger)' }}>
                  {formatEuro(totals.liabilities)}
                </span>
              </div>
              <div className="stagger-list flex flex-col gap-2">
                {liabilities.map((a) => <AccountRow key={a.id} account={a} onEdit={() => openEdit(a)} />)}
              </div>
            </section>
          )}
        </>
      )}

      <AccountDrawer
        open={drawer.open}
        mode={drawer.mode}
        account={drawer.account}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        onSaved={onAccountsSaved}
      />
    </div>
  )
}
