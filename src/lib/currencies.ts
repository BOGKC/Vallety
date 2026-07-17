// ── ISO 4217 currency catalogue ───────────────────────────────────────────────
// Single source of truth for every currency the app supports. Each entry carries
// the ISO code, English name, a display symbol, and decimal_places (minor-unit
// digits). Zero-decimal currencies (JPY, KRW, ISK, HUF…) must render as whole
// numbers — formatCurrency() reads decimal_places from here.

export interface Currency {
  code: string          // ISO 4217, e.g. "EUR"
  name: string          // e.g. "Euro"
  symbol: string        // e.g. "€"
  decimal_places: number
}

export const CURRENCIES: Currency[] = [
  // ── European set ──
  { code: 'EUR', name: 'Euro', symbol: '€', decimal_places: 2 },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimal_places: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimal_places: 2 },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimal_places: 2 },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimal_places: 2 },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimal_places: 2 },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr', decimal_places: 0 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimal_places: 2 },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', decimal_places: 2 },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', decimal_places: 2 },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', decimal_places: 0 },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', decimal_places: 2 },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', decimal_places: 2 },

  // ── Major global set ──
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimal_places: 0 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimal_places: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimal_places: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimal_places: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimal_places: 2 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimal_places: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimal_places: 2 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimal_places: 2 },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimal_places: 0 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimal_places: 2 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', decimal_places: 2 },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimal_places: 2 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimal_places: 2 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimal_places: 2 },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$', decimal_places: 2 },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', decimal_places: 2 },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', decimal_places: 2 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', decimal_places: 2 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimal_places: 2 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimal_places: 0 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimal_places: 2 },
]

const BY_CODE: Record<string, Currency> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c]),
)

export const DEFAULT_CURRENCY = 'EUR'

/** Look up a currency by code (case-insensitive). Undefined if unknown. */
export function getCurrency(code: string | null | undefined): Currency | undefined {
  if (!code) return undefined
  return BY_CODE[code.toUpperCase()]
}

/** True if `code` is a currency the app supports. */
export function isSupportedCurrency(code: string | null | undefined): boolean {
  return !!code && code.toUpperCase() in BY_CODE
}

/** Minor-unit digits for a currency (2 by default; 0 for JPY/KRW/ISK/HUF/IDR). */
export function currencyDecimals(code: string): number {
  return getCurrency(code)?.decimal_places ?? 2
}

/** Display symbol for a currency, falling back to the code itself. */
export function currencySymbol(code: string): string {
  return getCurrency(code)?.symbol ?? code
}

/**
 * Filter the catalogue by a free-text query matching code, name, or symbol
 * (case-insensitive). "kro" → SEK/NOK/DKK/ISK; "yen" → JPY. Empty query returns
 * the whole list. Used by the searchable currency picker.
 */
export function searchCurrencies(query: string): Currency[] {
  const q = fold(query)
  if (!q) return CURRENCIES
  return CURRENCIES.filter(
    (c) => fold(c.code).includes(q) || fold(c.name).includes(q) || fold(c.symbol).includes(q),
  )
}

/** Lowercase + strip diacritics so "kro" matches "Króna" and "zloty" matches "Złoty". */
function fold(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}
