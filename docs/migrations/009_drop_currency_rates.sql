-- 009_drop_currency_rates.sql — remove the FX rate cache.
-- The currency-conversion feature was removed: the app now displays every amount
-- in its own currency and never converts between them, so the daily rate cache
-- and its refresh job are no longer needed. Run in the Supabase SQL editor.
-- Safe/idempotent — only acts if the objects exist.

-- Stop the daily refresh cron job, if it was scheduled.
do $$
begin
  perform cron.unschedule('refresh-rates-daily');
exception when others then
  null; -- pg_cron not installed or job absent — nothing to do
end $$;

-- Drop the table (its RLS policy goes with it).
drop table if exists public.currency_rates;

-- The refresh-rates Edge Function, if deployed, can be removed with:
--   supabase functions delete refresh-rates
