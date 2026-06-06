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
