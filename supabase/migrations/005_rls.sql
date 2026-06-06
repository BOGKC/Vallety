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
