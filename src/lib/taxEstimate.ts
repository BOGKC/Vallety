// SIMPLIFIED ESTIMATE — base percentages only. Must be reviewed by a Finnish tax
// professional before users rely on these figures.
//
// A deliberately transparent MVP model: flat base rates, no brackets, no
// deductions, no municipality logic. Every figure it produces is an
// approximation and must be shown alongside the "approximate estimate" notice
// (see src/shared/components/ApproxNotice.tsx). All rates live in TAX_RATES so
// they can be updated in a single edit when Finnish rates change.

/** The one place rates are defined. Adjust here when the law/model changes. */
export const TAX_RATES = {
  ALV_STANDARD: 0.255, // Finnish VAT standard rate 25.5%
  ALV_REDUCED_1: 0.14, // reduced rate (food, restaurants)
  ALV_REDUCED_2: 0.10, // reduced rate (books, transport, etc.)
  INCOME_TAX_ESTIMATE: 0.30, // simplified flat income tax estimate ~30%
  YEL_RATE: 0.241, // YEL pension contribution ~24.1%
} as const

/** Coerce a possibly-messy numeric input to a finite, non-negative number. */
function clean(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0
}

export interface ALVResult {
  net: number // amount excluding VAT
  alv: number // the VAT portion
  gross: number // amount including VAT
}

/**
 * Split a VAT-inclusive gross amount into its net and VAT (ALV) parts.
 * net = gross / (1 + rate); alv = gross − net.
 */
export function estimateALV(grossAmount: number, rate: number = TAX_RATES.ALV_STANDARD): ALVResult {
  const gross = clean(grossAmount)
  const r = Number.isFinite(rate) && rate >= 0 ? rate : TAX_RATES.ALV_STANDARD
  const net = gross / (1 + r)
  return { net, alv: gross - net, gross }
}

/**
 * A rough, flat-percentage income-tax estimate — NOT bracket-based and not
 * your real liability. Just annualIncome × rate.
 */
export function estimateIncomeTax(annualIncome: number, rate: number = TAX_RATES.INCOME_TAX_ESTIMATE): number {
  const r = Number.isFinite(rate) && rate >= 0 ? rate : TAX_RATES.INCOME_TAX_ESTIMATE
  return clean(annualIncome) * r
}

/** Estimated YEL pension contribution: yelIncome × rate. */
export function estimateYEL(yelIncome: number, rate: number = TAX_RATES.YEL_RATE): number {
  const r = Number.isFinite(rate) && rate >= 0 ? rate : TAX_RATES.YEL_RATE
  return clean(yelIncome) * r
}

export interface TakeHomeLine {
  key: string
  label: string
  /** Signed amount: revenue positive, deductions negative. */
  amount: number
  /** Short human note, e.g. "25.5% of gross" — shows which rate was applied. */
  note: string
}

export interface TakeHomeBreakdown {
  revenue: number
  alvCollected: number
  netRevenue: number
  incomeTax: number
  yel: number
  expenses: number
  takeHome: number
  rates: { alvRate: number; incomeTaxRate: number; yelRate: number }
  /** Ordered line items so the UI can show exactly how the number was reached. */
  lines: TakeHomeLine[]
}

export interface TakeHomeInput {
  /** VAT-inclusive revenue collected. */
  revenue: number
  /** Business expenses (net). */
  expenses: number
  alvRate?: number
  incomeTaxRate?: number
  yelRate?: number
}

/**
 * The headline "safe to pay yourself" estimate:
 *   revenue − ALV collected − estimated income tax − estimated YEL − expenses
 * Income tax and YEL are applied to NET (ex-VAT) revenue — you don't pay income
 * tax on the VAT you merely collect for Vero. Returns a full line-item breakdown
 * so the number is never a black box. Handles empty/zero inputs → €0 gracefully.
 */
export function estimateTakeHome(input: TakeHomeInput): TakeHomeBreakdown {
  const revenue = clean(input.revenue)
  const expenses = clean(input.expenses)
  const alvRate = input.alvRate ?? TAX_RATES.ALV_STANDARD
  const incomeTaxRate = input.incomeTaxRate ?? TAX_RATES.INCOME_TAX_ESTIMATE
  const yelRate = input.yelRate ?? TAX_RATES.YEL_RATE

  const { net: netRevenue, alv: alvCollected } = estimateALV(revenue, alvRate)
  const incomeTax = netRevenue * incomeTaxRate
  const yel = netRevenue * yelRate
  const takeHome = netRevenue - incomeTax - yel - expenses

  const pct = (r: number) => `${(r * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`

  return {
    revenue,
    alvCollected,
    netRevenue,
    incomeTax,
    yel,
    expenses,
    takeHome,
    rates: { alvRate, incomeTaxRate, yelRate },
    lines: [
      { key: 'revenue', label: 'Revenue (incl. ALV)', amount: revenue, note: 'money collected' },
      { key: 'alv', label: 'ALV collected', amount: -alvCollected, note: `${pct(alvRate)} VAT, set aside for Vero` },
      { key: 'income_tax', label: 'Estimated income tax', amount: -incomeTax, note: `${pct(incomeTaxRate)} of net revenue` },
      { key: 'yel', label: 'Estimated YEL', amount: -yel, note: `${pct(yelRate)} of net revenue` },
      { key: 'expenses', label: 'Business expenses', amount: -expenses, note: 'your logged costs' },
    ],
  }
}

// ── Rate resolution & disclosure text ─────────────────────────────────────────

/** Parse a percent string like "30" or "24,1" into a decimal, or the fallback. */
export function parsePercent(value: string | null | undefined, fallback: number): number {
  if (value == null || String(value).trim() === '') return fallback
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n / 100 : fallback
}

export interface EstimateRateOverrides {
  incomeTaxPct?: string
  alvPct?: string
  yelPct?: string
}

/** Effective rates = the user's settings if provided, else the TAX_RATES defaults. */
export function resolveRates(overrides: EstimateRateOverrides = {}): {
  alvRate: number; incomeTaxRate: number; yelRate: number
} {
  return {
    alvRate: parsePercent(overrides.alvPct, TAX_RATES.ALV_STANDARD),
    incomeTaxRate: parsePercent(overrides.incomeTaxPct, TAX_RATES.INCOME_TAX_ESTIMATE),
    yelRate: parsePercent(overrides.yelPct, TAX_RATES.YEL_RATE),
  }
}

/** The exact percentages in use, for the info tooltip. */
export function ratesSummary(rates: { alvRate: number; incomeTaxRate: number; yelRate: number }): string {
  const p = (r: number) => `${(r * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`
  return `Estimated using: VAT ${p(rates.alvRate)}, income tax ~${p(rates.incomeTaxRate)}, YEL ${p(rates.yelRate)}. These are general rates, not your exact figures.`
}

/** The mandatory fuller disclaimer shown on heros and the tax section. */
export const APPROX_DISCLAIMER =
  'This is a simplified estimate based on standard percentages, not your exact tax situation. ' +
  'Actual amounts depend on deductions, your municipality, and other factors. ' +
  'Always confirm with a veroasiantuntija (tax professional).'
