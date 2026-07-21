-- ============================================================
-- 000_full_setup.sql — one-shot schema setup for a fresh project
-- ============================================================
-- Run this ONCE in the Supabase SQL editor on a brand-new project. It bundles,
-- in dependency order:
--   001 profiles · 002 personal · 003 business · 004 investment · 005 RLS
--   · plan columns · 006 profile-extended (phone/municipality/language + avatars)
-- and finally backfills profile rows for any users who signed up earlier.
-- Safe to run on an empty database; the base CREATEs are not re-runnable, so
-- only run the whole bundle again on a truly fresh project.
-- ============================================================


-- ####################################################################
-- >>> supabase/migrations/001_profiles.sql
-- ####################################################################
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

-- ####################################################################
-- >>> supabase/migrations/002_personal.sql
-- ####################################################################
-- ============================================================
-- Migration 002: personal finance tables
-- accounts, transactions, budgets, goals, bills, debts,
-- net_worth_snapshots
-- ============================================================

create type public.account_type as enum (
  'checking', 'savings', 'credit_card', 'cash',
  'investment', 'loan', 'mortgage', 'other'
);

create type public.transaction_type as enum ('income', 'expense', 'transfer');

create type public.recurrence as enum (
  'none', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
);

create type public.goal_status as enum ('active', 'completed', 'paused', 'cancelled');

create type public.debt_type as enum (
  'credit_card', 'student_loan', 'auto_loan', 'mortgage',
  'personal_loan', 'medical', 'other'
);

-- ----------------------------------------------------------
-- accounts
-- ----------------------------------------------------------
create table public.accounts (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  name            text        not null,
  type            account_type not null,
  institution     text,
  balance         numeric(14,2) not null default 0,
  currency        currency_code not null default 'USD',
  is_active       boolean     not null default true,
  color           text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts(user_id);

create trigger accounts_updated_at
  before update on public.accounts
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------
-- transactions
-- ----------------------------------------------------------
create table public.transactions (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  account_id      uuid        not null references public.accounts(id) on delete cascade,
  type            transaction_type not null,
  amount          numeric(14,2) not null check (amount >= 0),
  description     text        not null,
  category        text        not null,
  subcategory     text,
  date            date        not null,
  is_recurring    boolean     not null default false,
  recurrence      recurrence  not null default 'none',
  transfer_account_id uuid    references public.accounts(id) on delete set null,
  notes           text,
  tags            text[]      default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index transactions_user_id_idx    on public.transactions(user_id);
create index transactions_account_id_idx on public.transactions(account_id);
create index transactions_date_idx       on public.transactions(date desc);
create index transactions_category_idx   on public.transactions(user_id, category);

create trigger transactions_updated_at
  before update on public.transactions
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------
-- budgets
-- ----------------------------------------------------------
create table public.budgets (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  category        text        not null,
  amount          numeric(14,2) not null check (amount >= 0),
  period          recurrence  not null default 'monthly',
  color           text,
  is_active       boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, category, period)
);

create index budgets_user_id_idx on public.budgets(user_id);

create trigger budgets_updated_at
  before update on public.budgets
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------
-- goals
-- ----------------------------------------------------------
create table public.goals (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  name            text        not null,
  target_amount   numeric(14,2) not null check (target_amount > 0),
  current_amount  numeric(14,2) not null default 0 check (current_amount >= 0),
  target_date     date,
  status          goal_status not null default 'active',
  linked_account_id uuid      references public.accounts(id) on delete set null,
  color           text,
  icon            text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index goals_user_id_idx on public.goals(user_id);

create trigger goals_updated_at
  before update on public.goals
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------
-- bills (upcoming recurring payments)
-- ----------------------------------------------------------
create table public.bills (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  name            text        not null,
  amount          numeric(14,2) not null check (amount >= 0),
  due_day         smallint    not null check (due_day between 1 and 31),
  category        text        not null,
  recurrence      recurrence  not null default 'monthly',
  auto_pay        boolean     not null default false,
  is_active       boolean     not null default true,
  last_paid_date  date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index bills_user_id_idx on public.bills(user_id);

create trigger bills_updated_at
  before update on public.bills
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------
-- debts
-- ----------------------------------------------------------
create table public.debts (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  name            text        not null,
  type            debt_type   not null,
  original_balance numeric(14,2) not null check (original_balance > 0),
  current_balance numeric(14,2) not null check (current_balance >= 0),
  interest_rate   numeric(6,4) not null default 0 check (interest_rate >= 0),
  minimum_payment numeric(14,2) not null default 0,
  due_day         smallint    check (due_day between 1 and 31),
  lender          text,
  is_active       boolean     not null default true,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index debts_user_id_idx on public.debts(user_id);

create trigger debts_updated_at
  before update on public.debts
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------
-- net_worth_snapshots  (monthly point-in-time)
-- ----------------------------------------------------------
create table public.net_worth_snapshots (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  snapshot_date   date        not null,
  total_assets    numeric(14,2) not null default 0,
  total_liabilities numeric(14,2) not null default 0,
  net_worth       numeric(14,2) generated always as (total_assets - total_liabilities) stored,
  notes           text,
  created_at      timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

create index net_worth_snapshots_user_id_idx on public.net_worth_snapshots(user_id, snapshot_date desc);

-- ####################################################################
-- >>> supabase/migrations/003_business.sql
-- ####################################################################
-- ============================================================
-- Migration 003: business tables
-- clients, invoices, invoice_lines, expenses, mileage_log,
-- tax_payments
-- ============================================================

create type public.invoice_status as enum (
  'draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled'
);

create type public.payment_method as enum (
  'cash', 'check', 'bank_transfer', 'credit_card',
  'paypal', 'stripe', 'venmo', 'zelle', 'other'
);

create type public.expense_category as enum (
  'advertising', 'auto_travel', 'bank_fees', 'commissions',
  'contractors', 'depreciation', 'dues_subscriptions',
  'equipment', 'home_office', 'insurance', 'interest',
  'legal_professional', 'meals_entertainment', 'office_supplies',
  'rent_lease', 'repairs_maintenance', 'software', 'taxes_licenses',
  'telephone', 'travel', 'utilities', 'wages', 'other'
);

-- ----------------------------------------------------------
-- business_clients
-- ----------------------------------------------------------
create table public.business_clients (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  name            text        not null,
  email           text,
  phone           text,
  company         text,
  address_line1   text,
  address_line2   text,
  city            text,
  state           text,
  postal_code     text,
  country         text        default 'US',
  tax_id          text,
  notes           text,
  is_active       boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index business_clients_user_id_idx on public.business_clients(user_id);

create trigger business_clients_updated_at
  before update on public.business_clients
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------
-- invoices
-- ----------------------------------------------------------
create table public.invoices (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  client_id       uuid        not null references public.business_clients(id) on delete restrict,
  invoice_number  text        not null,
  status          invoice_status not null default 'draft',
  issue_date      date        not null default current_date,
  due_date        date        not null,
  subtotal        numeric(14,2) not null default 0,
  tax_rate        numeric(6,4) not null default 0 check (tax_rate >= 0 and tax_rate <= 1),
  tax_amount      numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  total           numeric(14,2) not null default 0,
  amount_paid     numeric(14,2) not null default 0,
  currency        currency_code not null default 'USD',
  notes           text,
  terms           text,
  paid_at         timestamptz,
  payment_method  payment_method,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, invoice_number)
);

create index invoices_user_id_idx   on public.invoices(user_id);
create index invoices_client_id_idx on public.invoices(client_id);
create index invoices_status_idx    on public.invoices(user_id, status);
create index invoices_due_date_idx  on public.invoices(due_date);

create trigger invoices_updated_at
  before update on public.invoices
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------
-- invoice_lines
-- ----------------------------------------------------------
create table public.invoice_lines (
  id              uuid        primary key default gen_random_uuid(),
  invoice_id      uuid        not null references public.invoices(id) on delete cascade,
  description     text        not null,
  quantity        numeric(10,3) not null default 1 check (quantity > 0),
  unit_price      numeric(14,2) not null check (unit_price >= 0),
  amount          numeric(14,2) generated always as (quantity * unit_price) stored,
  sort_order      smallint    not null default 0,
  created_at      timestamptz not null default now()
);

create index invoice_lines_invoice_id_idx on public.invoice_lines(invoice_id);

-- ----------------------------------------------------------
-- business_expenses
-- ----------------------------------------------------------
create table public.business_expenses (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  category        expense_category not null,
  description     text        not null,
  amount          numeric(14,2) not null check (amount >= 0),
  date            date        not null,
  vendor          text,
  receipt_url     text,
  is_deductible   boolean     not null default true,
  payment_method  payment_method,
  notes           text,
  tags            text[]      default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index business_expenses_user_id_idx  on public.business_expenses(user_id);
create index business_expenses_date_idx     on public.business_expenses(user_id, date desc);
create index business_expenses_category_idx on public.business_expenses(user_id, category);

create trigger business_expenses_updated_at
  before update on public.business_expenses
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------
-- mileage_log
-- ----------------------------------------------------------
create table public.mileage_log (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  date            date        not null,
  purpose         text        not null,
  from_location   text        not null,
  to_location     text        not null,
  miles           numeric(8,1) not null check (miles > 0),
  rate_per_mile   numeric(6,4) not null,
  total_deduction numeric(14,2) generated always as (miles * rate_per_mile) stored,
  is_business     boolean     not null default true,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index mileage_log_user_id_idx on public.mileage_log(user_id, date desc);

create trigger mileage_log_updated_at
  before update on public.mileage_log
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------
-- tax_payments
-- ----------------------------------------------------------
create type public.tax_type as enum (
  'federal_income', 'state_income', 'self_employment',
  'estimated_quarterly', 'payroll', 'sales', 'property', 'other'
);

create table public.tax_payments (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  type            tax_type    not null,
  amount          numeric(14,2) not null check (amount >= 0),
  payment_date    date        not null,
  tax_year        smallint    not null,
  quarter         smallint    check (quarter between 1 and 4),
  reference_number text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index tax_payments_user_id_idx on public.tax_payments(user_id, tax_year desc);

create trigger tax_payments_updated_at
  before update on public.tax_payments
  for each row execute procedure public.set_updated_at();

-- ####################################################################
-- >>> supabase/migrations/004_investment.sql
-- ####################################################################
-- ============================================================
-- Migration 004: investment tables
-- portfolios, holdings, investment_transactions, watchlist
-- ============================================================

create type public.asset_class as enum (
  'stock', 'etf', 'mutual_fund', 'bond', 'crypto',
  'real_estate', 'commodity', 'options', 'cash_equivalent', 'other'
);

create type public.investment_tx_type as enum (
  'buy', 'sell', 'dividend', 'split', 'transfer_in', 'transfer_out',
  'reinvestment', 'fee', 'interest', 'return_of_capital'
);

-- ----------------------------------------------------------
-- portfolios
-- ----------------------------------------------------------
create table public.portfolios (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  name            text        not null,
  description     text,
  currency        currency_code not null default 'USD',
  is_taxable      boolean     not null default true,
  institution     text,
  account_number  text,
  color           text,
  is_active       boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index portfolios_user_id_idx on public.portfolios(user_id);

create trigger portfolios_updated_at
  before update on public.portfolios
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------
-- holdings  (current positions, updated on each transaction)
-- ----------------------------------------------------------
create table public.holdings (
  id              uuid        primary key default gen_random_uuid(),
  portfolio_id    uuid        not null references public.portfolios(id) on delete cascade,
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  symbol          text        not null,
  name            text        not null,
  asset_class     asset_class not null,
  shares          numeric(18,8) not null default 0,
  avg_cost_basis  numeric(14,6) not null default 0,
  current_price   numeric(14,6),
  current_value   numeric(14,2),
  unrealized_gain numeric(14,2),
  last_price_update timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (portfolio_id, symbol)
);

create index holdings_portfolio_id_idx on public.holdings(portfolio_id);
create index holdings_user_id_idx      on public.holdings(user_id);
create index holdings_symbol_idx       on public.holdings(symbol);

create trigger holdings_updated_at
  before update on public.holdings
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------
-- investment_transactions
-- ----------------------------------------------------------
create table public.investment_transactions (
  id              uuid        primary key default gen_random_uuid(),
  portfolio_id    uuid        not null references public.portfolios(id) on delete cascade,
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  holding_id      uuid        references public.holdings(id) on delete set null,
  type            investment_tx_type not null,
  symbol          text        not null,
  shares          numeric(18,8) not null default 0,
  price_per_share numeric(14,6) not null default 0,
  total_amount    numeric(14,2) not null,
  fees            numeric(14,2) not null default 0,
  date            date        not null,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index investment_transactions_portfolio_id_idx on public.investment_transactions(portfolio_id);
create index investment_transactions_user_id_idx      on public.investment_transactions(user_id);
create index investment_transactions_symbol_idx       on public.investment_transactions(user_id, symbol);
create index investment_transactions_date_idx         on public.investment_transactions(date desc);

create trigger investment_transactions_updated_at
  before update on public.investment_transactions
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------
-- watchlist
-- ----------------------------------------------------------
create table public.watchlist (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  symbol          text        not null,
  name            text        not null,
  asset_class     asset_class not null default 'stock',
  target_buy_price  numeric(14,6),
  target_sell_price numeric(14,6),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, symbol)
);

create index watchlist_user_id_idx on public.watchlist(user_id);

create trigger watchlist_updated_at
  before update on public.watchlist
  for each row execute procedure public.set_updated_at();

-- ####################################################################
-- >>> supabase/migrations/005_rls.sql
-- ####################################################################
-- ============================================================
-- Migration 005: Row Level Security
-- Enable RLS and add user-scoped policies on all tables.
-- Users can only read/write their own rows.
-- ============================================================

-- helper: current authenticated user id
-- (auth.uid() is built-in to Supabase)

-- ----------------------------------------------------------
-- profiles
-- ----------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- insert is handled by the trigger (security definer), no direct insert policy needed

-- ----------------------------------------------------------
-- accounts
-- ----------------------------------------------------------
alter table public.accounts enable row level security;

create policy "accounts: select own"
  on public.accounts for select
  using (auth.uid() = user_id);

create policy "accounts: insert own"
  on public.accounts for insert
  with check (auth.uid() = user_id);

create policy "accounts: update own"
  on public.accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "accounts: delete own"
  on public.accounts for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- transactions
-- ----------------------------------------------------------
alter table public.transactions enable row level security;

create policy "transactions: select own"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "transactions: insert own"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "transactions: update own"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "transactions: delete own"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- budgets
-- ----------------------------------------------------------
alter table public.budgets enable row level security;

create policy "budgets: select own"  on public.budgets for select  using (auth.uid() = user_id);
create policy "budgets: insert own"  on public.budgets for insert  with check (auth.uid() = user_id);
create policy "budgets: update own"  on public.budgets for update  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budgets: delete own"  on public.budgets for delete  using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- goals
-- ----------------------------------------------------------
alter table public.goals enable row level security;

create policy "goals: select own"  on public.goals for select  using (auth.uid() = user_id);
create policy "goals: insert own"  on public.goals for insert  with check (auth.uid() = user_id);
create policy "goals: update own"  on public.goals for update  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals: delete own"  on public.goals for delete  using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- bills
-- ----------------------------------------------------------
alter table public.bills enable row level security;

create policy "bills: select own"  on public.bills for select  using (auth.uid() = user_id);
create policy "bills: insert own"  on public.bills for insert  with check (auth.uid() = user_id);
create policy "bills: update own"  on public.bills for update  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bills: delete own"  on public.bills for delete  using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- debts
-- ----------------------------------------------------------
alter table public.debts enable row level security;

create policy "debts: select own"  on public.debts for select  using (auth.uid() = user_id);
create policy "debts: insert own"  on public.debts for insert  with check (auth.uid() = user_id);
create policy "debts: update own"  on public.debts for update  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "debts: delete own"  on public.debts for delete  using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- net_worth_snapshots
-- ----------------------------------------------------------
alter table public.net_worth_snapshots enable row level security;

create policy "net_worth_snapshots: select own"  on public.net_worth_snapshots for select  using (auth.uid() = user_id);
create policy "net_worth_snapshots: insert own"  on public.net_worth_snapshots for insert  with check (auth.uid() = user_id);
create policy "net_worth_snapshots: update own"  on public.net_worth_snapshots for update  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "net_worth_snapshots: delete own"  on public.net_worth_snapshots for delete  using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- business_clients
-- ----------------------------------------------------------
alter table public.business_clients enable row level security;

create policy "business_clients: select own"  on public.business_clients for select  using (auth.uid() = user_id);
create policy "business_clients: insert own"  on public.business_clients for insert  with check (auth.uid() = user_id);
create policy "business_clients: update own"  on public.business_clients for update  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "business_clients: delete own"  on public.business_clients for delete  using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- invoices
-- ----------------------------------------------------------
alter table public.invoices enable row level security;

create policy "invoices: select own"  on public.invoices for select  using (auth.uid() = user_id);
create policy "invoices: insert own"  on public.invoices for insert  with check (auth.uid() = user_id);
create policy "invoices: update own"  on public.invoices for update  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "invoices: delete own"  on public.invoices for delete  using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- invoice_lines  (no direct user_id; access is through invoices)
-- ----------------------------------------------------------
alter table public.invoice_lines enable row level security;

create policy "invoice_lines: select via invoice"
  on public.invoice_lines for select
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_lines.invoice_id
        and i.user_id = auth.uid()
    )
  );

create policy "invoice_lines: insert via invoice"
  on public.invoice_lines for insert
  with check (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_lines.invoice_id
        and i.user_id = auth.uid()
    )
  );

create policy "invoice_lines: update via invoice"
  on public.invoice_lines for update
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_lines.invoice_id
        and i.user_id = auth.uid()
    )
  );

create policy "invoice_lines: delete via invoice"
  on public.invoice_lines for delete
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_lines.invoice_id
        and i.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------
-- business_expenses
-- ----------------------------------------------------------
alter table public.business_expenses enable row level security;

create policy "business_expenses: select own"  on public.business_expenses for select  using (auth.uid() = user_id);
create policy "business_expenses: insert own"  on public.business_expenses for insert  with check (auth.uid() = user_id);
create policy "business_expenses: update own"  on public.business_expenses for update  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "business_expenses: delete own"  on public.business_expenses for delete  using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- mileage_log
-- ----------------------------------------------------------
alter table public.mileage_log enable row level security;

create policy "mileage_log: select own"  on public.mileage_log for select  using (auth.uid() = user_id);
create policy "mileage_log: insert own"  on public.mileage_log for insert  with check (auth.uid() = user_id);
create policy "mileage_log: update own"  on public.mileage_log for update  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mileage_log: delete own"  on public.mileage_log for delete  using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- tax_payments
-- ----------------------------------------------------------
alter table public.tax_payments enable row level security;

create policy "tax_payments: select own"  on public.tax_payments for select  using (auth.uid() = user_id);
create policy "tax_payments: insert own"  on public.tax_payments for insert  with check (auth.uid() = user_id);
create policy "tax_payments: update own"  on public.tax_payments for update  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tax_payments: delete own"  on public.tax_payments for delete  using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- portfolios
-- ----------------------------------------------------------
alter table public.portfolios enable row level security;

create policy "portfolios: select own"  on public.portfolios for select  using (auth.uid() = user_id);
create policy "portfolios: insert own"  on public.portfolios for insert  with check (auth.uid() = user_id);
create policy "portfolios: update own"  on public.portfolios for update  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "portfolios: delete own"  on public.portfolios for delete  using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- holdings
-- ----------------------------------------------------------
alter table public.holdings enable row level security;

create policy "holdings: select own"  on public.holdings for select  using (auth.uid() = user_id);
create policy "holdings: insert own"  on public.holdings for insert  with check (auth.uid() = user_id);
create policy "holdings: update own"  on public.holdings for update  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "holdings: delete own"  on public.holdings for delete  using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- investment_transactions
-- ----------------------------------------------------------
alter table public.investment_transactions enable row level security;

create policy "investment_transactions: select own"  on public.investment_transactions for select  using (auth.uid() = user_id);
create policy "investment_transactions: insert own"  on public.investment_transactions for insert  with check (auth.uid() = user_id);
create policy "investment_transactions: update own"  on public.investment_transactions for update  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "investment_transactions: delete own"  on public.investment_transactions for delete  using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- watchlist
-- ----------------------------------------------------------
alter table public.watchlist enable row level security;

create policy "watchlist: select own"  on public.watchlist for select  using (auth.uid() = user_id);
create policy "watchlist: insert own"  on public.watchlist for insert  with check (auth.uid() = user_id);
create policy "watchlist: update own"  on public.watchlist for update  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "watchlist: delete own"  on public.watchlist for delete  using (auth.uid() = user_id);

-- ####################################################################
-- >>> docs/migrations/003_plan.sql
-- ####################################################################
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

-- ####################################################################
-- >>> docs/migrations/006_profile_extended.sql
-- ####################################################################
-- 006_profile_extended.sql — extra profile columns + avatar storage.
-- Run in the Supabase SQL editor. These back the fully-editable Profile page
-- (src/pages/profile/ProfilePage.tsx + src/shared/lib/profileSync.ts). The app
-- degrades gracefully without them (profileSync retries with core columns only),
-- but applying this makes phone / municipality / language persist server-side
-- and enables avatar uploads.

-- ── profiles: extra editable fields ──────────────────────────────────────────
alter table public.profiles
  add column if not exists phone         text,
  add column if not exists municipality  text,
  add column if not exists language      text not null default 'en'
    check (language in ('en', 'fi', 'sv'));

-- ── avatars storage bucket ───────────────────────────────────────────────────
-- Public-read bucket so profile.avatar_url can be rendered with a plain <img>
-- (the public object URL does not consult RLS). Writes are restricted to the
-- owner via the policies below (path is "<user-id>/avatar.<ext>", so the first
-- path segment must equal auth.uid()).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Listing/selecting via the storage API is owner-only, so the bucket can't be
-- enumerated to harvest every user's id. (A blanket `using (bucket_id='avatars')`
-- read policy would expose all "<user-id>/avatar.*" paths.) Public rendering is
-- unaffected because it uses the public object URL, not this policy.
do $$ begin
  create policy "avatars: owner list"
    on storage.objects for select
    using (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

-- Owners can upload / overwrite / delete only files under their own folder.
do $$ begin
  create policy "avatars: owner insert"
    on storage.objects for insert
    with check (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "avatars: owner update"
    on storage.objects for update
    using (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "avatars: owner delete"
    on storage.objects for delete
    using (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

-- ── Optional: widen the currency enum ────────────────────────────────────────
-- The app offers SEK/NOK/DKK/PLN in the Home currency dropdown but keeps them
-- local-only until the enum below is widened AND src/supabase/types.ts +
-- DB_CURRENCIES in profileSync.ts are updated to match. Left commented so the
-- default deploy stays in sync with the generated types.
-- alter type public.currency_code add value if not exists 'SEK';
-- alter type public.currency_code add value if not exists 'NOK';
-- alter type public.currency_code add value if not exists 'DKK';
-- alter type public.currency_code add value if not exists 'PLN';

-- ####################################################################
-- >>> Backfill: profiles for users created before this table existed
-- ####################################################################
-- The on_auth_user_created trigger (migration 001) only fires for NEW signups,
-- so anyone who registered before the profiles table was created has no row.
-- Create one for each such user from their auth metadata.
insert into public.profiles (id, email, full_name, avatar_url)
select u.id, u.email,
       u.raw_user_meta_data->>'full_name',
       u.raw_user_meta_data->>'avatar_url'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- ####################################################################
-- >>> docs/migrations/007_rls_hardening.sql
-- ####################################################################
-- 007_rls_hardening.sql — defense-in-depth on top of migration 005 (RLS).
-- Run in the Supabase SQL editor. Idempotent; safe to re-run.
--
-- What 005 already guarantees (audited): RLS is ENABLED on every table and each
-- user-owned table has select/insert/update/delete policies keyed to
-- auth.uid() = user_id (invoice_lines goes through its parent invoice; profiles
-- keys on id). This file adds three hardening measures the audit recommended.

-- ── 1) Auto-set user_id to the caller on insert (point 4) ─────────────────────
-- The insert policies already REJECT rows whose user_id isn't the caller
-- (WITH CHECK auth.uid() = user_id). These defaults mean a client that simply
-- omits user_id still gets the correct owner instead of a NOT NULL error — so
-- it is impossible to create a row for someone else, and easy to create your own.
alter table public.accounts                alter column user_id set default auth.uid();
alter table public.transactions            alter column user_id set default auth.uid();
alter table public.budgets                 alter column user_id set default auth.uid();
alter table public.goals                   alter column user_id set default auth.uid();
alter table public.bills                   alter column user_id set default auth.uid();
alter table public.debts                   alter column user_id set default auth.uid();
alter table public.net_worth_snapshots     alter column user_id set default auth.uid();
alter table public.business_clients        alter column user_id set default auth.uid();
alter table public.invoices                alter column user_id set default auth.uid();
alter table public.business_expenses       alter column user_id set default auth.uid();
alter table public.mileage_log             alter column user_id set default auth.uid();
alter table public.tax_payments            alter column user_id set default auth.uid();
alter table public.portfolios              alter column user_id set default auth.uid();
alter table public.holdings                alter column user_id set default auth.uid();
alter table public.investment_transactions alter column user_id set default auth.uid();
alter table public.watchlist               alter column user_id set default auth.uid();
-- (invoice_lines has no user_id — it is scoped through its parent invoice.
--  profiles.id is the user's own auth id, set by the signup trigger.)

-- ── 2) Tighten the premium_waitlist insert policy ─────────────────────────────
-- Original policy was WITH CHECK (true), which let a caller attribute a waitlist
-- row to any user_id. Restrict it: anonymous rows (user_id null) are fine, and a
-- signed-in caller may only stamp their own id. No read policy exists, so the
-- list stays unreadable from the client (service role / dashboard only).
drop policy if exists "waitlist insert" on public.premium_waitlist;
create policy "waitlist insert" on public.premium_waitlist
  for insert
  with check (user_id is null or user_id = auth.uid());

-- ── 3) Private 'receipts' storage bucket (point 5) ────────────────────────────
-- business_expenses.receipt_url is designed to hold uploaded receipts, but no
-- bucket exists yet. Create it PRIVATE (unlike avatars, receipts are sensitive
-- financial documents) with strict owner-only read AND write. Convention:
-- object path is "<user-id>/<expense-id>.<ext>", so the first folder segment
-- must equal the caller's id for every operation.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

do $$ begin
  create policy "receipts: owner read"
    on storage.objects for select
    using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "receipts: owner insert"
    on storage.objects for insert
    with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "receipts: owner update"
    on storage.objects for update
    using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "receipts: owner delete"
    on storage.objects for delete
    using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;

-- ── Note on the 'avatars' bucket ──────────────────────────────────────────────
-- avatars is intentionally PUBLIC-read (profile pictures are rendered via a
-- plain <img src>), with writes still owner-scoped. That is the correct posture
-- for avatars. Do NOT copy it for receipts — receipts must never be public.

-- ── Optional (not required for safety) ────────────────────────────────────────
-- The 005 policies target the default PUBLIC role. Because they test
-- auth.uid() = user_id and auth.uid() is NULL for the anon role, anon already
-- matches zero rows. If you want them to additionally never even evaluate for
-- anon, recreate each with "... to authenticated ...". Purely cosmetic here.

-- ####################################################################
-- >>> Billing columns are server-writable only (see 010_*)
-- ####################################################################
-- RLS limits a user to their own profiles row but is not column-aware, so
-- without this an authenticated client could self-grant a paid plan via
--   supabase.from('profiles').update({ plan: 'all_access' }).
-- This trigger keeps the billing columns writable only by trusted server roles
-- (the future Stripe webhook using the service_role key); ordinary profile
-- edits still apply. SECURITY INVOKER is required so current_user is the real
-- caller's PostgREST role.
create or replace function public.enforce_plan_immutable_by_client()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.plan           := old.plan;
    new.plan_status    := old.plan_status;
    new.plan_renews_at := old.plan_renews_at;
    new.trial_ends_at  := old.trial_ends_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_plan_immutable on public.profiles;
create trigger profiles_enforce_plan_immutable
  before update on public.profiles
  for each row
  execute function public.enforce_plan_immutable_by_client();
