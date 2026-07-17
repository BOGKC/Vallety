// ── Exchange rates & currency conversion ─────────────────────────────────────
// Rates are expressed the way the ECB publishes them: EUR is the base, and each
// value is "how many units of that currency equal 1 EUR" (e.g. USD 1.08 ⇒
// 1 EUR = 1.08 USD). This is stored in the currency_rates.rate_to_eur column and
// refreshed daily by the refresh-rates Edge Function from
// https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
//
// A bundled snapshot (FALLBACK_RATES) ships with the app so conversions work
// offline, before the first Edge Function run, and for the handful of currencies
// the ECB feed doesn't publish (AED, SAR, RUB, UAH). Live rates from the DB are
// layered on top when available.

export type RateMap = Record<string, number> // code → units per 1 EUR

/** Approximate snapshot (units per 1 EUR). Only a safety net — live rates win. */
export const FALLBACK_RATES: RateMap = {
  EUR: 1,
  USD: 1.08, GBP: 0.85, SEK: 11.4, NOK: 11.5, DKK: 7.46, ISK: 149, CHF: 0.97,
  PLN: 4.3, CZK: 25.1, HUF: 390, RON: 4.97, BGN: 1.9558,
  JPY: 168, CNY: 7.8, INR: 90, AUD: 1.63, CAD: 1.47, NZD: 1.77, SGD: 1.46,
  HKD: 8.45, KRW: 1470, AED: 3.97, SAR: 4.05, TRY: 35, ZAR: 20, BRL: 5.9,
  MXN: 19.5, RUB: 98, UAH: 43, THB: 39, MYR: 5.1, IDR: 17300, PHP: 62,
}

export interface ConversionResult {
  /** Converted amount in the target currency, or null when a rate is missing. */
  amount: number | null
  /** True when both currencies had a usable rate. */
  ok: boolean
}

/**
 * Convert `amount` from one currency to another using an EUR-based rate map.
 * Cross-rates are derived through EUR: value_to = amount × rate[to] / rate[from].
 * Returns { ok:false, amount:null } when either currency has no rate, so callers
 * can show the original amount with a note instead of a wrong number or a crash.
 */
export function convert(amount: number, from: string, to: string, rates: RateMap): ConversionResult {
  const f = (from || '').toUpperCase()
  const t = (to || '').toUpperCase()
  if (!Number.isFinite(amount)) return { amount: null, ok: false }
  if (f === t) return { amount, ok: true }
  const rf = rates[f]
  const rt = rates[t]
  if (!rf || !rt || !Number.isFinite(rf) || !Number.isFinite(rt)) {
    return { amount: null, ok: false }
  }
  return { amount: (amount * rt) / rf, ok: true }
}

/** Merge live rates over the bundled fallback, keeping EUR pinned to 1. */
export function mergeRates(live: RateMap | null | undefined): RateMap {
  return { ...FALLBACK_RATES, ...(live ?? {}), EUR: 1 }
}
