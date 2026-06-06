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
