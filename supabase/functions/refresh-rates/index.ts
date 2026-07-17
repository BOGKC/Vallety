// refresh-rates — daily FX refresh from the European Central Bank.
//
// Fetches the ECB euro reference rates (EUR-based, one <Cube currency rate/>
// per currency) and upserts them into public.currency_rates. EUR itself is
// pinned to 1. Run on a daily schedule:
//
//   supabase functions deploy refresh-rates --no-verify-jwt
//   -- then in the dashboard: Database → Cron (pg_cron) or Edge Function schedule:
//   select cron.schedule('refresh-rates-daily','30 16 * * 1-5',
//     $$ select net.http_post(
//          url := 'https://<ref>.functions.supabase.co/refresh-rates',
//          headers := jsonb_build_object('Authorization','Bearer <anon-or-cron-secret>')
//        ) $$);
//
// The ECB publishes ~30 currencies (not AED/SAR/RUB/UAH — those keep their
// seeded snapshot values from migration 008).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ECB_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'

Deno.serve(async () => {
  try {
    const res = await fetch(ECB_URL, { headers: { accept: 'application/xml' } })
    if (!res.ok) {
      return json({ ok: false, error: `ECB fetch failed: ${res.status}` }, 502)
    }
    const xml = await res.text()

    // Parse <Cube currency='USD' rate='1.0812'/> lines (no XML lib needed).
    const rows: { currency_code: string; rate_to_eur: number }[] = [{ currency_code: 'EUR', rate_to_eur: 1 }]
    const re = /currency=['"]([A-Z]{3})['"]\s+rate=['"]([0-9.]+)['"]/g
    let m: RegExpExecArray | null
    while ((m = re.exec(xml)) !== null) {
      const rate = Number(m[2])
      if (Number.isFinite(rate) && rate > 0) rows.push({ currency_code: m[1], rate_to_eur: rate })
    }
    if (rows.length <= 1) {
      return json({ ok: false, error: 'No rates parsed from ECB feed' }, 502)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // service role bypasses RLS
    )
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('currency_rates')
      .upsert(rows.map((r) => ({ ...r, updated_at: now })), { onConflict: 'currency_code' })
    if (error) return json({ ok: false, error: error.message }, 500)

    return json({ ok: true, updated: rows.length, updated_at: now })
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'unknown error' }, 500)
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
