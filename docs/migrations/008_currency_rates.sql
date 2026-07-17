-- 008_currency_rates.sql — daily FX rate cache (ECB, EUR-based).
-- Run in the Supabase SQL editor. Populated/refreshed by the refresh-rates Edge
-- Function (supabase/functions/refresh-rates). Rates are public, non-sensitive
-- reference data: anyone may read them; only the service role (Edge Function)
-- writes, so there is no client insert/update/delete policy.

create table if not exists public.currency_rates (
  currency_code text primary key,                 -- ISO 4217, e.g. 'USD'
  rate_to_eur   numeric(20,10) not null,          -- ECB convention: units of this currency per 1 EUR
  updated_at    timestamptz not null default now()
);

alter table public.currency_rates enable row level security;

-- Public read (rates are not user data). Recreate idempotently.
drop policy if exists "currency_rates: public read" on public.currency_rates;
create policy "currency_rates: public read"
  on public.currency_rates for select
  using (true);

-- Seed a snapshot so conversions work before the first Edge Function run.
-- (Matches FALLBACK_RATES in src/shared/lib/rates.ts.)
insert into public.currency_rates (currency_code, rate_to_eur) values
  ('EUR', 1),
  ('USD', 1.08), ('GBP', 0.85), ('SEK', 11.4), ('NOK', 11.5), ('DKK', 7.46),
  ('ISK', 149), ('CHF', 0.97), ('PLN', 4.3), ('CZK', 25.1), ('HUF', 390),
  ('RON', 4.97), ('BGN', 1.9558), ('JPY', 168), ('CNY', 7.8), ('INR', 90),
  ('AUD', 1.63), ('CAD', 1.47), ('NZD', 1.77), ('SGD', 1.46), ('HKD', 8.45),
  ('KRW', 1470), ('AED', 3.97), ('SAR', 4.05), ('TRY', 35), ('ZAR', 20),
  ('BRL', 5.9), ('MXN', 19.5), ('RUB', 98), ('UAH', 43), ('THB', 39),
  ('MYR', 5.1), ('IDR', 17300), ('PHP', 62)
on conflict (currency_code) do nothing;
