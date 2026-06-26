import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  ArrowDownLeft, ArrowUpRight, Target, TrendingUp, ChevronDown,
} from 'lucide-react'
import { loadFinanceData } from '../../shared/lib/localData'
import { computeDashboard } from '../../shared/lib/dashboardData'
import { formatEuro } from '../../shared/lib/formatters'
import { cn } from '../../shared/lib/cn'

// ── Small utilities ─────────────────────────────────────────────────────────────

function timeGreeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function DeltaPill({ delta, invert = false }: { delta: number | null; invert?: boolean }) {
  if (delta === null) {
    return <span className="text-[12px] text-text-muted">—</span>
  }
  // For most metrics an increase is good; for expenses it's the opposite.
  const positive = invert ? delta < 0 : delta >= 0
  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium"
      style={{
        backgroundColor: positive ? 'var(--color-success-muted)' : 'var(--color-danger-muted)',
        color: positive ? 'var(--color-success)' : 'var(--color-danger)',
      }}
    >
      {delta >= 0 ? '+' : ''}{delta}%
    </span>
  )
}

// ── Cash flow tooltip ───────────────────────────────────────────────────────────

interface TooltipPayload {
  active?: boolean
  label?: string
  payload?: { name: string; value: number; color: string }[]
}

function CashflowTooltip({ active, label, payload }: TooltipPayload) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div
      className="rounded-md border border-default bg-bg-elevated px-3 py-2 shadow-lg"
      style={{ borderRadius: 'var(--radius-md)' }}
    >
      <p className="mb-1 text-[11px] font-medium text-text-muted">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-[12px]">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-text-secondary">{p.name}</span>
          <span className="ml-auto font-medium text-text-primary">{formatEuro(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Metric card ─────────────────────────────────────────────────────────────────

function MetricCard({
  icon, iconColor, label, value, valueColor, children,
}: {
  icon: React.ReactNode
  iconColor: string
  label: string
  value: string
  valueColor?: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-lg bg-bg-card p-4">
      <div className="flex items-center gap-2">
        <span style={{ color: iconColor }}>{icon}</span>
        <span className="text-[12px] text-text-muted">{label}</span>
      </div>
      <p
        className="mt-2 text-[24px] font-semibold leading-tight"
        style={{ color: valueColor ?? 'var(--text-primary)' }}
      >
        {value}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function PersonalDashboard() {
  const [showBreakdown, setShowBreakdown] = useState(false)

  const now = useMemo(() => new Date(), [])
  const metrics = useMemo(() => computeDashboard(loadFinanceData(), now), [now])
  const greeting = timeGreeting(now.getHours())

  const {
    hasData, monthLabel, safeToSpend, income, expenses, budget, saved,
    cashflow, upcomingBills,
  } = metrics

  const hasCashflow = cashflow.some((m) => m.income > 0 || m.expenses > 0)

  // Safe-to-spend color logic (share of monthly income).
  const safeColor = (() => {
    if (!safeToSpend.hasIncome) return 'var(--text-muted)'
    const pct = (safeToSpend.amount / safeToSpend.income) * 100
    if (safeToSpend.amount < 0 || pct < 5) return 'var(--color-danger)'
    if (pct <= 20) return 'var(--color-warning)'
    return 'var(--color-success)'
  })()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* SECTION 1 — Greeting / welcome ─────────────────────────────────────── */}
      {hasData ? (
        <div>
          <h1 className="text-[22px] font-semibold text-text-primary">{greeting}</h1>
          <p className="mt-1 text-[14px] text-text-secondary">
            Here's your financial snapshot for {monthLabel}
          </p>
        </div>
      ) : (
        <div className="rounded-lg bg-bg-card p-6">
          <h1 className="text-[20px] font-semibold text-text-primary">Welcome to Vallety</h1>
          <p className="mt-1.5 max-w-xl text-[14px] text-text-secondary">
            Start by adding your first transaction, setting a budget, or creating a
            savings goal.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {[
              { label: 'Add transaction', to: '/transactions' },
              { label: 'Set a budget', to: '/budgets' },
              { label: 'Create a goal', to: '/goals' },
            ].map((cta) => (
              <Link
                key={cta.to}
                to={cta.to}
                className="rounded-md text-[14px] font-medium text-white"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  padding: '12px 20px',
                  transition: 'var(--transition-fast)',
                }}
              >
                {cta.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2 — Safe-to-spend hero ─────────────────────────────────────── */}
      <div className="rounded-lg bg-bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className="text-[12px] font-medium uppercase text-text-muted"
              style={{ letterSpacing: '0.08em' }}
            >
              Safe to spend
            </p>
            <p
              className="mt-1 text-[52px] font-bold leading-none"
              style={{ color: safeColor }}
            >
              {safeToSpend.hasIncome ? formatEuro(safeToSpend.amount) : '€—'}
            </p>
            <p className="mt-2 text-[13px] text-text-secondary">
              After bills, budgets and goals
            </p>
          </div>

          <button
            onClick={() => setShowBreakdown((v) => !v)}
            className="flex flex-shrink-0 items-center gap-1 text-[12px] text-text-muted hover:text-text-secondary"
            style={{ transition: 'var(--transition-fast)' }}
            aria-expanded={showBreakdown}
          >
            How is this calculated?
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform duration-200', showBreakdown && 'rotate-180')}
            />
          </button>
        </div>

        {/* Breakdown panel */}
        <div
          className="overflow-hidden transition-all duration-200"
          style={{ maxHeight: showBreakdown ? 260 : 0, opacity: showBreakdown ? 1 : 0 }}
        >
          <div className="mt-4 border-t border-subtle pt-4">
            {[
              { label: 'Monthly income', value: safeToSpend.income, neg: false },
              { label: 'Bills due this month', value: safeToSpend.bills, neg: true },
              { label: 'Budget allocations', value: safeToSpend.budgets, neg: true },
              { label: 'Goal contributions', value: safeToSpend.goals, neg: true },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-1.5 text-[13px]">
                <span className="text-text-secondary">{row.label}</span>
                <span className="text-text-primary">
                  {row.neg && row.value > 0 ? '-' : ''}{formatEuro(row.value)}
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between border-t border-subtle pt-2.5 text-[13px] font-semibold">
              <span style={{ color: 'var(--color-accent)' }}>= Safe to spend</span>
              <span style={{ color: 'var(--color-accent)' }}>
                {formatEuro(safeToSpend.amount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3 — Metric cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={<ArrowDownLeft className="h-4 w-4" />}
          iconColor="var(--color-success)"
          label="Income"
          value={formatEuro(income.value)}
        >
          <DeltaPill delta={income.delta} />
        </MetricCard>

        <MetricCard
          icon={<ArrowUpRight className="h-4 w-4" />}
          iconColor="var(--color-danger)"
          label="Expenses"
          value={formatEuro(expenses.value)}
        >
          <DeltaPill delta={expenses.delta} invert />
        </MetricCard>

        <MetricCard
          icon={<Target className="h-4 w-4" />}
          iconColor="var(--color-accent)"
          label="Budget used"
          value={`${budget.usedPct}%`}
        >
          <span className="text-[12px] text-text-muted">
            of {formatEuro(budget.total)} total
          </span>
        </MetricCard>

        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          iconColor={saved.value >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
          label="Saved"
          value={formatEuro(saved.value)}
          valueColor={saved.value >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
        >
          <DeltaPill delta={saved.delta} />
        </MetricCard>
      </div>

      {/* SECTION 4 — Cash flow chart ────────────────────────────────────────── */}
      <div className="rounded-lg bg-bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-text-primary">Cash flow</h2>
          <span className="text-[12px] text-text-muted">Last 6 months</span>
        </div>

        {hasCashflow ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={cashflow} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(34,197,94,0.15)" />
                  <stop offset="100%" stopColor="rgba(34,197,94,0.02)" />
                </linearGradient>
                <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(239,68,68,0.1)" />
                  <stop offset="100%" stopColor="rgba(239,68,68,0.02)" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              />
              <YAxis hide />
              <ReferenceLine y={0} stroke="var(--border-subtle)" />
              <Tooltip content={<CashflowTooltip />} cursor={{ stroke: 'var(--border-default)' }} />
              <Area
                type="monotone" dataKey="income" name="Income"
                stroke="#22C55E" strokeWidth={2} fill="url(#incomeFill)"
              />
              <Area
                type="monotone" dataKey="expenses" name="Expenses"
                stroke="#EF4444" strokeWidth={2} fill="url(#expenseFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[180px] items-center justify-center">
            <p className="text-[13px] text-text-muted">
              Add transactions to see your cash flow
            </p>
          </div>
        )}
      </div>

      {/* SECTION 5 — Upcoming bills ─────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-[12px] font-medium text-text-muted">Due in 7 days</p>
        {upcomingBills.length === 0 ? (
          <p className="text-[12px] text-text-muted">No bills due this week</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {upcomingBills.map((bill, i) => (
              <div
                key={`${bill.name}-${i}`}
                className="flex flex-shrink-0 items-center gap-2 rounded-full border border-default bg-bg-elevated px-3 py-1.5"
              >
                <span className="text-[12px] font-medium text-text-primary">{bill.name}</span>
                <span className="text-[12px]" style={{ color: 'var(--color-accent)' }}>
                  {formatEuro(bill.amount)}
                </span>
                <span className="text-[11px] text-text-muted">{bill.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
