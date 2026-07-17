// ── ISO 4217 currency catalogue, grouped by region ────────────────────────────
// Single source of truth for every currency the app supports. Amounts are always
// shown in their own currency (no conversion), so each entry only needs the ISO
// code, English name, a display symbol, and decimal_places (minor-unit digits).
// Zero-decimal currencies (JPY, KRW, ISK, HUF, IDR) must render as whole numbers
// — formatCurrency() reads decimal_places from here.

export interface Currency {
  code: string          // ISO 4217, e.g. "EUR"
  name: string          // e.g. "Euro"
  symbol: string        // e.g. "€"
  decimal_places: number
}

export interface CurrencyRegion {
  label: string
  currencies: Currency[]
}

// Per-currency data keyed by code.
const DATA: Record<string, Omit<Currency, 'code'>> = {
  EUR: { name: 'Euro', symbol: '€', decimal_places: 2 },
  SEK: { name: 'Swedish Krona', symbol: 'kr', decimal_places: 2 },
  NOK: { name: 'Norwegian Krone', symbol: 'kr', decimal_places: 2 },
  DKK: { name: 'Danish Krone', symbol: 'kr', decimal_places: 2 },
  ISK: { name: 'Icelandic Króna', symbol: 'kr', decimal_places: 0 },
  GBP: { name: 'British Pound', symbol: '£', decimal_places: 2 },
  CHF: { name: 'Swiss Franc', symbol: 'CHF', decimal_places: 2 },
  PLN: { name: 'Polish Złoty', symbol: 'zł', decimal_places: 2 },
  CZK: { name: 'Czech Koruna', symbol: 'Kč', decimal_places: 2 },
  HUF: { name: 'Hungarian Forint', symbol: 'Ft', decimal_places: 0 },
  RON: { name: 'Romanian Leu', symbol: 'lei', decimal_places: 2 },
  BGN: { name: 'Bulgarian Lev', symbol: 'лв', decimal_places: 2 },
  UAH: { name: 'Ukrainian Hryvnia', symbol: '₴', decimal_places: 2 },
  USD: { name: 'US Dollar', symbol: '$', decimal_places: 2 },
  CAD: { name: 'Canadian Dollar', symbol: 'C$', decimal_places: 2 },
  BRL: { name: 'Brazilian Real', symbol: 'R$', decimal_places: 2 },
  MXN: { name: 'Mexican Peso', symbol: 'Mex$', decimal_places: 2 },
  JPY: { name: 'Japanese Yen', symbol: '¥', decimal_places: 0 },
  CNY: { name: 'Chinese Yuan', symbol: '¥', decimal_places: 2 },
  INR: { name: 'Indian Rupee', symbol: '₹', decimal_places: 2 },
  AUD: { name: 'Australian Dollar', symbol: 'A$', decimal_places: 2 },
  NZD: { name: 'New Zealand Dollar', symbol: 'NZ$', decimal_places: 2 },
  SGD: { name: 'Singapore Dollar', symbol: 'S$', decimal_places: 2 },
  HKD: { name: 'Hong Kong Dollar', symbol: 'HK$', decimal_places: 2 },
  KRW: { name: 'South Korean Won', symbol: '₩', decimal_places: 0 },
  THB: { name: 'Thai Baht', symbol: '฿', decimal_places: 2 },
  MYR: { name: 'Malaysian Ringgit', symbol: 'RM', decimal_places: 2 },
  IDR: { name: 'Indonesian Rupiah', symbol: 'Rp', decimal_places: 0 },
  PHP: { name: 'Philippine Peso', symbol: '₱', decimal_places: 2 },
  AED: { name: 'UAE Dirham', symbol: 'د.إ', decimal_places: 2 },
  SAR: { name: 'Saudi Riyal', symbol: '﷼', decimal_places: 2 },
  TRY: { name: 'Turkish Lira', symbol: '₺', decimal_places: 2 },
  ZAR: { name: 'South African Rand', symbol: 'R', decimal_places: 2 },
}

const cur = (code: string): Currency => ({ code, ...DATA[code] })

// Region groups, in picker order. Eurozone & Nordics first (Finland-first app).
export const CURRENCY_REGIONS: CurrencyRegion[] = [
  { label: 'Eurozone & Nordics', currencies: ['EUR', 'SEK', 'NOK', 'DKK', 'ISK'].map(cur) },
  { label: 'Rest of Europe', currencies: ['GBP', 'CHF', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'UAH'].map(cur) },
  { label: 'Americas', currencies: ['USD', 'CAD', 'BRL', 'MXN'].map(cur) },
  { label: 'Asia-Pacific', currencies: ['JPY', 'CNY', 'INR', 'AUD', 'NZD', 'SGD', 'HKD', 'KRW', 'THB', 'MYR', 'IDR', 'PHP'].map(cur) },
  { label: 'Middle East & Africa', currencies: ['AED', 'SAR', 'TRY', 'ZAR'].map(cur) },
]

/** Flat list of every supported currency, in region order. */
export const CURRENCIES: Currency[] = CURRENCY_REGIONS.flatMap((r) => r.currencies)

const BY_CODE: Record<string, Currency> = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]))

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

/** Lowercase + strip diacritics so "kro" matches "Króna" and "zloty" matches "Złoty". */
function fold(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function matches(c: Currency, q: string): boolean {
  return fold(c.code).includes(q) || fold(c.name).includes(q) || fold(c.symbol).includes(q)
}

/**
 * Filter the flat catalogue by a free-text query matching code, name, or symbol
 * (case/diacritic-insensitive). "kro" → SEK/NOK/DKK/ISK; "yen" → JPY. Empty
 * query returns the whole list.
 */
export function searchCurrencies(query: string): Currency[] {
  const q = fold(query)
  if (!q) return CURRENCIES
  return CURRENCIES.filter((c) => matches(c, q))
}

/**
 * The region groups, optionally filtered by a search query. Regions with no
 * matches are dropped, so the grouped picker can render headers + options and
 * still support type-to-filter across every group.
 */
export function groupedCurrencies(query = ''): CurrencyRegion[] {
  const q = fold(query)
  if (!q) return CURRENCY_REGIONS
  return CURRENCY_REGIONS
    .map((r) => ({ label: r.label, currencies: r.currencies.filter((c) => matches(c, q)) }))
    .filter((r) => r.currencies.length > 0)
}
