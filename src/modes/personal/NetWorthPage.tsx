import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  Plus, TrendingUp, Landmark, Pencil, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '../../shared/lib/formatters'
import {
  readAccounts, ensureMonthlySnapshot, groupByCurrency, monthlyDelta,
  ACCOUNT_ICONS, accountTypeLabel, isLiability,
  type Account, type Snapshot, type CurrencyTotals,
} from '../../shared/lib/netWorth'
import { AccountDrawer } from './AccountDrawer'
import { EmptyState } from '../../components/EmptyState'
import { AnimatedMoney } from '../../components/AnimatedNumber'
import { readHoldings, computePortfolio } from '../../shared/lib/portfolio'
import { useHomeCurrency } from '../../shared/hooks/useHomeCurrency'
import { currencySymbol } from '../../lib/currencies'

interface ChartTooltipProps {
  active?: boolean
  payload?: { payload: { net: number; date: string; currency: string } }[]
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  return (
    <div className="rounded-md border border-default bg-bg-elevated px-3 py-2 shadow-lg">
      <p className="text-[11px] text-text-muted">
        {new Date(point.date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
      <p className="text-[13px] font-medium text-text-primary">Net worth: {formatCurrency(point.net, point.currency)}</p>
    </div>
  )
}

/** Render a set of per-currency totals as "€1,200 · $340 · 450 kr" (no summing). */
function GroupedTotals({ groups, pick }: { groups: CurrencyTotals[]; pick: 'assets' | 'liabilities' | 'net' }) {
  const parts = groups.filter((g) => pick === 'net' || g[pick] !== 0)
  if (parts.length === 0) return <>{formatCurrency(0, groups[0]?.currency ?? 'EUR')}</>
  return (
    <>
      {parts.map((g, i) => (
        <span key={g.currency}>
          {i > 0 && <span className="text-text-muted"> · </span>}
          {formatCurrency(g[pick], g.currency)}
        </span>
      ))}
    </>
  )
}

function AccountRow({ account, onEdit }: { account: Account; onEdit: () => void }) {
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
        {formatCurrency(account.balance, account.currency)}
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
  const navigate = useNavigate()
  const home = useHomeCurrency()
  const [accounts, setAccounts] = useState<Account[]>(() => readAccounts())
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => ensureMonthlySnapshot())
  const [drawer, setDrawer] = useState<{ open: boolean; mode: 'add' | 'edit'; account: Account | null }>({
    open: false, mode: 'add', account: null,
  })

  const now = useMemo(() => new Date(), [])

  // Modes are lenses over one dataset: the investment portfolio counts toward
  // net worth here as a synthetic (read-only) asset row.
  const portfolioValue = useMemo(() => computePortfolio(readHoldings()).totalValue, [])
  const allAssets = useMemo<Account[]>(
    () =>
      portfolioValue > 0
        ? [
            ...accounts,
            {
              id: '__portfolio',
              name: 'Investment portfolio',
              type: 'investment',
              institution: 'Managed in Investor mode',
              balance: portfolioValue,
              currency: 'EUR',
              createdAt: '',
            },
          ]
        : accounts,
    [accounts, portfolioValue]
  )

  // Per-currency totals. No conversion happens — balances are only summed
  // within the same currency, never across, so we never show a meaningless
  // mixed-currency number.
  const groups = useMemo(() => groupByCurrency(allAssets, home), [allAssets, home])
  const singleCurrency = groups.length <= 1
  const soleNet = singleCurrency ? (groups[0]?.net ?? 0) : 0
  // The trend chart & month-over-month delta only make sense in one currency
  // (there's no conversion to reconcile a mixed set), so they show only then.
  const trendCurrency = groups[0]?.currency ?? home

  const delta = useMemo(
    () => (singleCurrency ? monthlyDelta(soleNet, snapshots, now) : null),
    [singleCurrency, soleNet, snapshots, now],
  )

  const hasAccounts = allAssets.length > 0
  const assets = allAssets.filter((a) => !isLiability(a.type))
  const liabilities = allAssets.filter((a) => isLiability(a.type))

  const chartData = useMemo(
    () => snapshots.map((s) => ({ label: format(new Date(s.date), 'MMM'), net: s.netWorth, date: s.date, currency: trendCurrency })),
    [snapshots, trendCurrency]
  )
  const hasNegative = chartData.some((s) => s.net < 0)

  const heroColor =
    !hasAccounts
      ? 'var(--text-muted)'
      : singleCurrency
        ? (soleNet > 0 ? '#22C55E' : soleNet < 0 ? '#EF4444' : 'var(--text-muted)')
        : 'var(--text-primary)'
  const heroIsEmpty = !hasAccounts

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
          className="btn-accent inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-white"
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
            <p className="num-hero mt-1 leading-none" style={{ color: heroColor, fontSize: 'clamp(28px, 8vw, 44px)' }}>
              {heroIsEmpty
                ? `${currencySymbol(home)}—`
                : singleCurrency
                  ? <AnimatedMoney value={soleNet} currency={trendCurrency} />
                  : <span className="num-hero" style={{ fontSize: 'clamp(20px, 5vw, 30px)' }}><GroupedTotals groups={groups} pick="net" /></span>}
            </p>
            {delta !== null && (
              <div
                className="mt-2 inline-flex items-center gap-1 text-[13px]"
                style={{ color: delta >= 0 ? '#22C55E' : '#EF4444' }}
              >
                {delta >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {delta >= 0 ? '+' : '-'}{formatCurrency(Math.abs(delta), home)} this month
              </div>
            )}
          </div>

          {/* Summary cards */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[18px] font-semibold" style={{ color: 'var(--color-success)' }}>
                <GroupedTotals groups={groups} pick="assets" />
              </p>
              <p className="mt-0.5 text-[12px] text-text-muted">Total assets</p>
            </div>
            <div className="rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[18px] font-semibold" style={{ color: 'var(--color-danger)' }}>
                <GroupedTotals groups={groups} pick="liabilities" />
              </p>
              <p className="mt-0.5 text-[12px] text-text-muted">Total liabilities</p>
            </div>
            <div className="rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[18px] font-semibold text-text-primary">{allAssets.length}</p>
              <p className="mt-0.5 text-[12px] text-text-muted">Accounts tracked</p>
            </div>
          </div>

          {/* Chart / empty state */}
          <div className="mt-5 rounded-lg border border-default bg-bg-card p-5">
            {!singleCurrency ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <TrendingUp className="h-9 w-9 text-text-muted" />
                <p className="max-w-xs text-[13px] text-text-secondary">
                  Your accounts span multiple currencies. The net-worth trend is shown
                  when all accounts use a single currency (amounts are never converted).
                </p>
              </div>
            ) : snapshots.length === 0 ? (
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
                  <GroupedTotals groups={groups} pick="assets" />
                </span>
              </div>
              <div className="stagger-list flex flex-col gap-2">
                {assets.map((a) => (
                  <AccountRow key={a.id} account={a}
                    onEdit={() => (a.id === '__portfolio' ? navigate('/investment/portfolio') : openEdit(a))} />
                ))}
              </div>
            </section>
          )}

          {/* Liabilities */}
          {liabilities.length > 0 && (
            <section className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-text-primary">Liabilities</h2>
                <span className="text-[14px] font-semibold" style={{ color: 'var(--color-danger)' }}>
                  <GroupedTotals groups={groups} pick="liabilities" />
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
