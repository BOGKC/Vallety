import { currencyDecimals } from '../../lib/currencies'

/**
 * Resolve the locale used for number/currency formatting. Prefers the browser
 * locale (so separators match what the user expects) and falls back to the
 * euro-first default the app shipped with.
 */
function resolveLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language
  return 'en-IE'
}

export interface FormatOpts {
  /** Override the currency's natural decimal places (e.g. 0 for compact totals). */
  decimals?: number
  /** Locale override; defaults to the user's browser locale. */
  locale?: string
}

/**
 * Format `amount` as `currencyCode`, correct for that currency: right symbol and
 * placement, right number of decimals (0 for JPY/KRW/ISK/HUF…), and thousands/
 * decimal separators from the user's locale (Intl.NumberFormat).
 *
 * The sign is derived from the ROUNDED value and rendered ahead of the whole
 * formatted amount, so a tiny negative that rounds to zero never shows "-€0"
 * and the sign never lands on the wrong side of the symbol.
 */
export function formatCurrency(amount: number, currencyCode: string, opts: FormatOpts = {}): string {
  const code = (currencyCode || 'EUR').toUpperCase()
  const decimals = opts.decimals ?? currencyDecimals(code)
  const locale = opts.locale ?? resolveLocale()

  const safe = Number.isFinite(amount) ? amount : 0
  const factor = 10 ** decimals
  const rounded = Math.round(safe * factor) / factor
  const sign = rounded < 0 ? '-' : ''

  let body: string
  try {
    body = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(Math.abs(rounded))
  } catch {
    // Unknown currency for this runtime's Intl, or narrowSymbol unsupported:
    // fall back to a plain grouped number with the code appended.
    const n = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(Math.abs(rounded))
    return `${sign}${n} ${code}`
  }
  return `${sign}${body}`
}

/**
 * Compact euro formatting — whole euros by default, sign before the symbol
 * (e.g. "-€1,200"). Kept as a thin, euro-specific wrapper over formatCurrency so
 * every existing euro call site renders identically while non-euro amounts get
 * proper per-currency formatting via formatCurrency.
 */
export const formatEuro = (value: number, decimals = 0): string =>
  formatCurrency(value, 'EUR', { decimals, locale: 'en-IE' })

/**
 * Parse a user-entered amount into a number, tolerating the comma decimal
 * separator common on EU/Finnish keyboards (e.g. "12,50" → 12.5) and stray
 * whitespace. Returns NaN for non-numeric input.
 */
export const parseAmount = (value: string): number =>
  Number(String(value).replace(/\s/g, '').replace(',', '.'))
