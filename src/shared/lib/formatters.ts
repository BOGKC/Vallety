/**
 * Compact euro formatting for the app. Renders the sign before the symbol
 * (e.g. "-€1,200") and rounds to whole euros by default. This is the single
 * money formatter — the app is euro-first, so there is intentionally no
 * USD/locale-currency helper.
 */
export const formatEuro = (value: number, decimals = 0): string => {
  const sign = value < 0 ? '-' : ''
  const abs = new Intl.NumberFormat('en-IE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value))
  return `${sign}€${abs}`
}

/**
 * Parse a user-entered amount into a number, tolerating the comma decimal
 * separator common on EU/Finnish keyboards (e.g. "12,50" → 12.5) and stray
 * whitespace. Returns NaN for non-numeric input.
 */
export const parseAmount = (value: string): number =>
  Number(String(value).replace(/\s/g, '').replace(',', '.'))
