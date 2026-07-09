import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  ArrowDownLeft, ArrowUpRight, Target, TrendingUp, ChevronDown, LayoutDashboard, Plus,
} from 'lucide-react'
import { readTransactions } from '../../shared/lib/transactions'
import { readBudgets } from '../../shared/lib/budgets'
import { readGoals } from '../../shared/lib/goals'
import { readBills } from '../../shared/lib/bills'
import { computeDashboard } from '../../shared/lib/dashboardData'
import { formatEuro } from '../../shared/lib/formatters'
import { cn } from '../../shared/lib/cn'
import { EmptyState } from '../../components/EmptyState'
import { AnimatedEuro, AnimatedPercent } from '../../components/AnimatedNumber'
import { SkeletonBlock, SkeletonMetricCard, SkeletonChartArea } from '../../components/skeletons'
import { useMinLoading } from '../../shared/hooks/useMinLoading'

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
  value: React.ReactNode
  valueColor?: string
  children?: React.ReactNode
}) {
  return (
    <div className="card rounded-lg border border-default bg-bg-card p-3 sm:p-4">
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

// ── Loading skeleton (matches the dashboard's shape) ────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-2">
        <SkeletonBlock width={180} height={22} />
        <SkeletonBlock width={240} height={14} />
      </div>
      <div className="rounded-lg bg-bg-card p-6">
        <SkeletonBlock width={120} height={12} />
        <div className="mt-2">
          <SkeletonBlock width={220} height={48} />
        </div>
      </div>
      <div className="cq-metrics">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonMetricCard key={i} />)}
      </div>
      <div className="rounded-lg bg-bg-card p-5">
        <SkeletonChartArea />
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function PersonalDashboard() {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const navigate = useNavigate()
  const loading = useMinLoading()

  const now = useMemo(() => new Date(), [])
  const metrics = useMemo(
    () => computeDashboard(
      {
        transactions: readTransactions(),
        budgets: readBudgets(),
        goals: readGoals(),
        bills: readBills(),
      },
      now
    ),
    [now]
  )
  const greeting = timeGreeting(now.getHours())

  const {
    hasData, monthLabel, safeToSpend, income, expenses, budget, saved,
    cashflow, upcomingBills,
  } = metrics

  const hasCashflow = cashflow.some((m) => m.income > 0 || m.expenses > 0)

  // Safe-to-spend colour logic (share of monthly income). Each state gets a
  // [from, to] pair so the hero number renders as a subtle gradient.
  const [safeFrom, safeTo] = (() => {
    if (!safeToSpend.hasIncome) return ['var(--text-muted)', 'var(--text-muted)']
    const pct = (safeToSpend.amount / safeToSpend.income) * 100
    if (safeToSpend.amount < 0 || pct < 5) return ['#EF4444', '#F87171']
    if (pct <= 20) return ['#F59E0B', '#FBBF24']
    return ['#22C55E', '#4ADE80']
  })()

  if (loading) return <DashboardSkeleton />

  if (!hasData) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-lg bg-bg-card">
          <EmptyState
            icon={LayoutDashboard}
            title="Welcome to Vallety"
            description="Add your first transaction to start seeing your financial picture."
            primaryAction={{ label: 'Add transaction', icon: Plus, onClick: () => navigate('/transactions') }}
            secondaryAction={{ label: 'Import CSV', onClick: () => navigate('/transactions') }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:gap-6">
      {/* SECTION 1 — Greeting ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-[22px] font-semibold text-text-primary">{greeting}</h1>
        <p className="mt-1 text-[14px] text-text-secondary">
          Here's your financial snapshot for {monthLabel}
        </p>
      </div>

      {/* SECTION 2 — Safe-to-spend hero ─────────────────────────────────────── */}
      <div className="relative">
        {/* Soft breathing pool of accent light behind the hero */}
        <div className="hero-glow" aria-hidden />
        <div className="relative rounded-lg bg-bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 text-center sm:text-left">
            <p
              className="text-[12px] font-medium uppercase text-text-muted"
              style={{ letterSpacing: '0.08em' }}
            >
              Safe to spend
            </p>
            <p
              className="num-hero mt-1 leading-none"
              style={{
                fontSize: 'clamp(32px, 8vw, 52px)',
                backgroundImage: `linear-gradient(135deg, ${safeFrom}, ${safeTo})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {safeToSpend.hasIncome ? <AnimatedEuro value={safeToSpend.amount} /> : '€—'}
            </p>
            <p className="mt-2 text-[13px] text-text-secondary">
              After bills, budgets and goals
            </p>
          </div>

          <button
            onClick={() => setShowBreakdown((v) => !v)}
            className="flex min-h-[44px] flex-shrink-0 items-center justify-center gap-1 self-center text-[12px] text-text-muted hover:text-text-secondary sm:min-h-0 sm:self-auto"
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
      </div>

      {/* SECTION 3 — Metric cards ───────────────────────────────────────────── */}
      <div className="stagger-list cq-metrics">
        <MetricCard
          icon={<ArrowDownLeft className="h-4 w-4" />}
          iconColor="var(--color-success)"
          label="Income"
          value={<AnimatedEuro value={income.value} />}
        >
          <DeltaPill delta={income.delta} />
        </MetricCard>

        <MetricCard
          icon={<ArrowUpRight className="h-4 w-4" />}
          iconColor="var(--color-danger)"
          label="Expenses"
          value={<AnimatedEuro value={expenses.value} />}
        >
          <DeltaPill delta={expenses.delta} invert />
        </MetricCard>

        <MetricCard
          icon={<Target className="h-4 w-4" />}
          iconColor="var(--color-accent)"
          label="Budget used"
          value={<AnimatedPercent value={budget.usedPct} />}
        >
          <span className="text-[12px] text-text-muted">
            of {formatEuro(budget.total)} total
          </span>
        </MetricCard>

        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          iconColor={saved.value >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
          label="Saved"
          value={<AnimatedEuro value={saved.value} />}
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
          <div className="h-40 w-full sm:h-44">
          <ResponsiveContainer width="100%" height="100%">
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
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center sm:h-44">
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
          <div
            className="no-scrollbar flex gap-2 overflow-x-auto pb-1"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
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
