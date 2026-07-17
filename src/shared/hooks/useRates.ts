import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../supabase/client'
import { convert as pureConvert, mergeRates, FALLBACK_RATES, type RateMap, type ConversionResult } from '../lib/rates'

// Untyped view — currency_rates isn't in the generated Database types.
const db = supabase as unknown as {
  from: (t: string) => {
    select: (cols: string) => Promise<{ data: { currency_code: string; rate_to_eur: number }[] | null; error: unknown }>
  }
}

async function fetchRates(): Promise<RateMap> {
  const { data, error } = await db.from('currency_rates').select('currency_code, rate_to_eur')
  if (error || !data) throw new Error('rates unavailable')
  const map: RateMap = {}
  for (const r of data) {
    const rate = Number(r.rate_to_eur)
    if (Number.isFinite(rate) && rate > 0) map[r.currency_code.toUpperCase()] = rate
  }
  return map
}

export interface UseRates {
  /** EUR-based rate map (units per 1 EUR), live rates merged over the fallback. */
  rates: RateMap
  /** Convert between two currencies; { ok:false } when a rate is missing. */
  convert: (amount: number, from: string, to: string) => ConversionResult
  /** True once the live fetch resolved (fallback is used before/if it fails). */
  ready: boolean
  /** 'live' when DB rates loaded, 'fallback' when using the bundled snapshot. */
  source: 'live' | 'fallback'
}

/**
 * Exchange rates for the app. Reads the daily cache from Supabase
 * (currency_rates) and layers it over the bundled FALLBACK_RATES so conversion
 * always works — offline, before the first refresh, or for currencies the ECB
 * feed omits. Refetches at most a few times a day.
 */
export function useRates(): UseRates {
  const { data, isSuccess } = useQuery({
    queryKey: ['currency_rates'],
    queryFn: fetchRates,
    staleTime: 1000 * 60 * 60 * 6, // 6h
    retry: 1,
  })

  const rates = mergeRates(data)
  const source: 'live' | 'fallback' = isSuccess && data && Object.keys(data).length > 1 ? 'live' : 'fallback'

  return {
    rates,
    convert: (amount, from, to) => pureConvert(amount, from, to, rates),
    ready: isSuccess,
    source,
  }
}

export { FALLBACK_RATES }
