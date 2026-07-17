import { useSyncExternalStore } from 'react'
import { readProfile, saveProfilePatch, DEFAULT_PROFILE } from '../lib/profile'
import { DEFAULT_CURRENCY, isSupportedCurrency } from '../../lib/currencies'
import { formatCurrency, type FormatOpts } from '../lib/formatters'

// The home currency lives in the local profile (vallety_profile.home_currency)
// and is mirrored to Supabase. Components read it through this hook so that
// changing it in Settings re-renders every total across the app immediately —
// without a refresh. We fire a dedicated event on change (localStorage 'storage'
// events don't fire in the same tab) and also listen for cross-tab updates.

export const CURRENCY_CHANGED_EVENT = 'vallety:home-currency-changed'

function subscribe(cb: () => void): () => void {
  window.addEventListener(CURRENCY_CHANGED_EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(CURRENCY_CHANGED_EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

function getSnapshot(): string {
  const c = readProfile().home_currency || DEFAULT_CURRENCY
  return isSupportedCurrency(c) ? c.toUpperCase() : DEFAULT_CURRENCY
}

/** The user's current home currency (defaults to EUR). Reactive. */
export function useHomeCurrency(): string {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_PROFILE.home_currency)
}

/**
 * A money formatter bound to the current home currency. Drop-in for the old
 * `formatEuro(x)` on single-currency figures (budgets, bills, income, spend):
 * `const money = useMoney(); money(amount)`. Re-renders when the home currency
 * changes, so those totals update everywhere immediately.
 */
export function useMoney(): (amount: number, opts?: FormatOpts) => string {
  const home = useHomeCurrency()
  return (amount, opts) => formatCurrency(amount, home, opts)
}

/**
 * Persist a new home currency and notify every subscriber in this tab so all
 * totals re-render instantly. (Profile save to Supabase is handled separately by
 * the settings page; this keeps localStorage + the live UI in sync.)
 */
export function setHomeCurrency(code: string): void {
  const next = isSupportedCurrency(code) ? code.toUpperCase() : DEFAULT_CURRENCY
  saveProfilePatch({ home_currency: next })
  window.dispatchEvent(new Event(CURRENCY_CHANGED_EVENT))
}

/** Fire the change event without re-persisting (caller already saved). */
export function notifyHomeCurrencyChanged(): void {
  window.dispatchEvent(new Event(CURRENCY_CHANGED_EVENT))
}
