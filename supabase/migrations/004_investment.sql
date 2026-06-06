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
