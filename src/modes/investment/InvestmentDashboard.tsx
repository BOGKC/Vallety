import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart as PieChartIcon, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { EmptyState } from '../../components/EmptyState'
import { AnimatedEuro } from '../../components/AnimatedNumber'
import { formatEuro } from '../../shared/lib/formatters'
import {
  readHoldings, computePortfolio, holdingValue, holdingGainPct,
} from '../../shared/lib/portfolio'

const SLICE_COLORS = ['#9333EA', '#C4B5FD', '#6C8AF0', '#5DCAA5', '#F59E0B']

export function InvestmentDashboard() {
  const navigate = useNavigate()
  const [holdings] = useState(() => readHoldings())
  const s = useMemo(() => computePortfolio(holdings), [holdings])

  if (holdings.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="sr-only">Investor dashboard</h1>
        <div className="rounded-lg bg-bg-card">
          <EmptyState
            icon={PieChartIcon}
            title="Welcome to Investor mode"
            description="Add your holdings — stocks, ETFs, funds, crypto — and Vallety tracks your portfolio's value, performance, allocation, and dividends."
            primaryAction={{ label: 'Add a holding', icon: Plus, onClick: () => navigate('/investment/portfolio') }}
          />
        </div>
      </div>
    )
  }

  const gainColor = s.gain >= 0 ? '#22C55E' : '#EF4444'
  const dayColor = s.dayChange >= 0 ? '#22C55E' : '#EF4444'
  const best = s.movers[0]
  const worst = s.movers[s.movers.length - 1]

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:gap-6">
      <h1 className="sr-only">Investor dashboard</h1>

      {/* Hero */}
      <div className="relative">
        <div className="hero-glow" aria-hidden />
        <div className="relative rounded-lg bg-bg-card p-6 text-center sm:text-left">
          <p className="text-[12px] font-medium uppercase text-text-muted" style={{ letterSpacing: '0.08em' }}>
            Portfolio value
          </p>
          <p className="num-hero mt-1 leading-none text-text-primary" style={{ fontSize: 'clamp(32px, 8vw, 52px)' }}>
            <AnimatedEuro value={s.totalValue} />
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <span className="inline-flex items-center gap-1 text-[13px] font-medium" style={{ color: gainColor }}>
              {s.gain >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {s.gain >= 0 ? '+' : ''}{formatEuro(s.gain)} ({s.gainPct.toFixed(1)}%) all time
            </span>
            <span className="text-[13px]" style={{ color: dayColor }}>
              {s.dayChange >= 0 ? '+' : ''}{formatEuro(s.dayChange)} ({s.dayChangePct.toFixed(1)}%) since last update
            </span>
          </div>
        </div>
      </div>

      {/* Allocation + metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-bg-card p-5">
          <h2 className="mb-2 text-[14px] font-semibold text-text-primary">Allocation</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={s.allocation}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {s.allocation.map((a, i) => (
                    <Cell key={a.type} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => formatEuro(v)}
                  contentStyle={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 10,
                    color: 'var(--text-primary)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {s.allocation.map((a, i) => (
              <span key={a.type} className="inline-flex items-center gap-1.5 text-[12px] text-text-secondary">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                {a.label} · {s.totalValue > 0 ? Math.round((a.value / s.totalValue) * 100) : 0}%
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="stagger-list grid grid-cols-2 gap-4">
            <div className="card rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[12px] text-text-muted">Invested</p>
              <p className="mt-1 text-[20px] font-semibold text-text-primary"><AnimatedEuro value={s.totalInvested} /></p>
            </div>
            <div className="card rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[12px] text-text-muted">Current value</p>
              <p className="mt-1 text-[20px] font-semibold text-text-primary"><AnimatedEuro value={s.totalValue} /></p>
            </div>
            <div className="card rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[12px] text-text-muted">Dividends YTD</p>
              <p className="mt-1 text-[20px] font-semibold" style={{ color: 'var(--color-success)' }}><AnimatedEuro value={s.dividendsYtd} /></p>
            </div>
            <div className="card rounded-lg border border-default bg-bg-card p-4">
              <p className="text-[12px] text-text-muted">Largest position</p>
              <p className="mt-1 text-[20px] font-semibold text-text-primary">{Math.round(s.topConcentrationPct)}%</p>
            </div>
          </div>

          {/* Top movers */}
          <div className="rounded-lg bg-bg-card p-5">
            <h2 className="mb-2 text-[14px] font-semibold text-text-primary">Top movers</h2>
            <div className="flex flex-col gap-2">
              {[best, ...(worst && worst !== best ? [worst] : [])].map((h) => {
                const pct = holdingGainPct(h)
                const c = pct >= 0 ? '#22C55E' : '#EF4444'
                return (
                  <div key={h.id} className="flex items-center gap-3">
                    <span className="w-14 flex-shrink-0 text-[13px] font-semibold text-text-primary">{h.ticker}</span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-text-muted">{h.name}</span>
                    <span className="text-[13px] text-text-secondary">{formatEuro(holdingValue(h))}</span>
                    <span className="w-16 text-right text-[13px] font-medium" style={{ color: c }}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-text-muted">
        Prices are entered manually — figures reflect your latest updates, not live market data.
      </p>
    </div>
  )
}
