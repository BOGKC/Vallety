-- ============================================================
-- Migration 001: profiles
-- User settings, active mode, and business configuration
-- ============================================================

create type public.app_mode as enum ('personal', 'business', 'investment');
create type public.business_type as enum (
  'sole_proprietor',
  'llc',
  'partnership',
  's_corp',
  'c_corp',
  'nonprofit',
  'other'
);
create type public.currency_code as enum (
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'MXN'
);

create table public.profiles (
  id                uuid        primary key references auth.users(id) on delete cascade,
  email             text        not null,
  full_name         text,
  avatar_url        text,
  active_mode       app_mode    not null default 'personal',
  currency          currency_code not null default 'USD',
  -- business fields
  business_name     text,
  business_type     business_type,
  tax_year_start    smallint    not null default 1  check (tax_year_start between 1 and 12),
  -- timestamps
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
