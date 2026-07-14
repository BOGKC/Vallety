-- 003_plan.sql — plan/billing columns + premium waitlist.
-- Run in the Supabase SQL editor. The app is local-first (plan state lives in
-- the profile in localStorage and works without this), but these columns let a
-- Stripe webhook flip the plan server-side and have the app read it.

-- ── profiles: plan state ────────────────────────────────────────────────────────
do $$ begin
  create type plan_tier as enum ('free','personal','freelancer','investor','business','all_access');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_status as enum ('active','trialing','cancelled','past_due');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists plan            plan_tier   not null default 'free',
  add column if not exists plan_status     plan_status not null default 'active',
  add column if not exists plan_renews_at  timestamptz,
  add column if not exists trial_ends_at   timestamptz;

-- ── premium_waitlist ─────────────────────────────────────────────────────────────
create table if not exists public.premium_waitlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  email       text not null,
  tier        plan_tier not null,
  period      text not null check (period in ('monthly','annual')),
  created_at  timestamptz not null default now()
);

alter table public.premium_waitlist enable row level security;

-- Anyone (incl. anon during checkout) may add their own row; nobody can read
-- the list from the client — only the service role / dashboard.
create policy "waitlist insert" on public.premium_waitlist
  for insert with check (true);

-- ── Enforcement note (Stripe era) ────────────────────────────────────────────────
-- When domain data moves server-side, add RLS/edge-function limit checks so a
-- free user cannot exceed their caps via a direct API call — e.g. a BEFORE
-- INSERT trigger on `transactions` that rejects the 51st row when
-- profiles.plan = 'free'. Today domain data is local-first, so the enforcement
-- point is the data-access layer in src/shared/lib/* + the gating UI.
