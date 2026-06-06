import { format, formatDistanceToNow } from 'date-fns'

export const formatCurrency = (amount: number, currency = 'USD'): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)

export const formatDate = (date: Date | string, pattern = 'MMM d, yyyy'): string =>
  format(new Date(date), pattern)

export const formatRelativeDate = (date: Date | string): string =>
  formatDistanceToNow(new Date(date), { addSuffix: true })

export const formatPercent = (value: number, decimals = 2): string =>
  `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat('en-US').format(value)
