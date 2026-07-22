-- Cross-user RLS proof. Runs in the Supabase SQL editor (or psql) as-is:
--   user A = 11111111-…  user B = 22222222-…
-- Everything happens inside begin;…rollback; so it leaves NO data behind.
begin;
insert into auth.users (id,email) values ('11111111-1111-1111-1111-111111111111','a@t'),('22222222-2222-2222-2222-222222222222','b@t') on conflict (id) do nothing;

-- Seed one row per table OWNED BY A, via service_role (bypasses RLS for setup).
set local role service_role;
insert into public.accounts (id,user_id,name,type) values ('a0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','A acct','checking');
insert into public.transactions (user_id,account_id,type,amount,description,category,date) values ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','expense',10,'x','Groceries',current_date);
insert into public.budgets (user_id,category,amount) values ('11111111-1111-1111-1111-111111111111','Food',100);
insert into public.goals (user_id,name,target_amount) values ('11111111-1111-1111-1111-111111111111','Trip',1000);
insert into public.bills (user_id,name,amount,due_day,category) values ('11111111-1111-1111-1111-111111111111','Rent',500,1,'Housing');
insert into public.debts (user_id,name,type,original_balance,current_balance) values ('11111111-1111-1111-1111-111111111111','Loan','personal_loan',100,50);
insert into public.net_worth_snapshots (user_id,snapshot_date) values ('11111111-1111-1111-1111-111111111111',current_date);
insert into public.business_clients (id,user_id,name) values ('c0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','A client');
insert into public.invoices (id,user_id,client_id,invoice_number,due_date) values ('40000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000001','A-1',current_date);
insert into public.invoice_lines (invoice_id,description,unit_price) values ('40000000-0000-0000-0000-000000000001','line',10);
insert into public.business_expenses (user_id,category,description,amount,date) values ('11111111-1111-1111-1111-111111111111','software','x',10,current_date);
insert into public.mileage_log (user_id,date,purpose,from_location,to_location,miles,rate_per_mile) values ('11111111-1111-1111-1111-111111111111',current_date,'biz','A','B',10,0.5);
insert into public.tax_payments (user_id,type,amount,payment_date,tax_year) values ('11111111-1111-1111-1111-111111111111','estimated_quarterly',10,current_date,2026);
insert into public.portfolios (id,user_id,name) values ('50000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','A port');
insert into public.holdings (portfolio_id,user_id,symbol,name,asset_class) values ('50000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','AAPL','Apple','stock');
insert into public.investment_transactions (portfolio_id,user_id,type,symbol,total_amount,date) values ('50000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','buy','AAPL',100,current_date);
insert into public.watchlist (user_id,symbol,name) values ('11111111-1111-1111-1111-111111111111','TSLA','Tesla');
reset role;

-- Now act as attacker B and prove NO access to A's rows in any table.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare
  tbls text[] := array['accounts','transactions','budgets','goals','bills','debts',
    'net_worth_snapshots','business_clients','invoices','business_expenses',
    'mileage_log','tax_payments','portfolios','holdings','investment_transactions','watchlist'];
  t text; n int;
begin
  foreach t in array tbls loop
    execute format('select count(*) from public.%I where user_id = %L', t, '11111111-1111-1111-1111-111111111111') into n;
    if n <> 0 then raise exception 'FAIL %: B SELECTed % of A rows', t, n; end if;
    execute format('with u as (update public.%I set user_id = user_id where user_id = %L returning 1) select count(*) from u', t, '11111111-1111-1111-1111-111111111111') into n;
    if n <> 0 then raise exception 'FAIL %: B UPDATEd % of A rows', t, n; end if;
    execute format('with d as (delete from public.%I where user_id = %L returning 1) select count(*) from d', t, '11111111-1111-1111-1111-111111111111') into n;
    if n <> 0 then raise exception 'FAIL %: B DELETEd % of A rows', t, n; end if;
    raise notice 'PASS %: cross-user select/update/delete all denied', t;
  end loop;

  -- invoice_lines (scoped through parent invoice, no user_id column)
  select count(*) into n from public.invoice_lines where invoice_id='40000000-0000-0000-0000-000000000001';
  if n <> 0 then raise exception 'FAIL invoice_lines: B read % of A lines', n; end if;
  raise notice 'PASS invoice_lines: parent-scoped read denied';

  -- profiles (id-based)
  select count(*) into n from public.profiles where id='11111111-1111-1111-1111-111111111111';
  if n <> 0 then raise exception 'FAIL profiles: B read % A profile rows', n; end if;
  raise notice 'PASS profiles: cross-user read denied';

  -- forged insert: B cannot create a row owned by A
  begin
    insert into public.accounts (user_id,name,type) values ('11111111-1111-1111-1111-111111111111','forged','checking');
    raise exception 'FAIL: B forged an A-owned row';
  exception when insufficient_privilege or check_violation then raise notice 'PASS: forged insert (user_id=A) blocked by WITH CHECK';
  end;
end $$;
rollback;
