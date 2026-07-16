-- ============================================================
-- rls_test.sql — cross-user RLS proof, run in the Supabase SQL editor.
-- ============================================================
-- Verifies at the DATABASE level (not the UI) that user B can never read,
-- update, delete, or forge user A's rows. It fakes two authenticated users by
-- switching `request.jwt.claims`, exactly as PostgREST does per request, so
-- auth.uid() returns each user's id in turn.
--
-- Everything runs inside ONE transaction that ROLLS BACK at the end — it
-- creates two throwaway auth users and some rows, proves the policies, and
-- leaves the database exactly as it was. Watch the "Messages"/NOTICE output:
-- every check prints "PASS: …". Any failure raises and aborts (still no writes
-- persist because of the final ROLLBACK / the abort).
--
-- If the auth.users insert errors on your Postgres version because a column is
-- required that isn't listed, add it to the insert — the rest is unaffected.

begin;

-- Fixed ids so we don't need to read anything back across role switches.
--   A = the victim, B = the attacker, ACCT = A's account, INV/LINE = A's invoice line
--   CLI = A's client (invoices.client_id is NOT NULL)
-- (literals inline below; kept here for reference)

-- 0) Two throwaway users. The on_auth_user_created trigger (migration 001) is
--    SECURITY DEFINER, so it creates their profiles rows automatically.
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'authenticated','authenticated','rls_a@test.local',
   crypt('pw-a', gen_salt('bf')), now(), now(), now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000000',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'authenticated','authenticated','rls_b@test.local',
   crypt('pw-b', gen_salt('bf')), now(), now(), now(), '{}', '{}');

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Act as USER A (authenticated) and create data A owns.
-- ─────────────────────────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

-- Positive path: A can insert its OWN rows (RLS insert WITH CHECK passes).
insert into public.accounts (id, user_id, name, type, balance)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc', auth.uid(), 'A secret checking', 'checking', 1234.56);

insert into public.business_clients (id, user_id, name)
  values ('c1111111-1111-1111-1111-111111111111', auth.uid(), 'A client');

insert into public.invoices (id, user_id, client_id, invoice_number, due_date, total)
  values ('11111111-1111-1111-1111-111111111111', auth.uid(),
          'c1111111-1111-1111-1111-111111111111', 'A-0001', current_date, 100);

insert into public.invoice_lines (id, invoice_id, description, quantity, unit_price)
  values ('d1111111-1111-1111-1111-111111111111',
          '11111111-1111-1111-1111-111111111111', 'A line item', 1, 100);

do $$
declare n int;
begin
  select count(*) into n from public.accounts where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  if n <> 1 then raise exception 'SETUP FAIL: user A could not create/read its own account'; end if;
  raise notice 'PASS: user A created and can read its own rows';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Switch to USER B (attacker). Role stays authenticated; only the identity
--    changes — same as a different logged-in user hitting the API.
-- ─────────────────────────────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

-- 2a) SELECT — B must see none of A's rows.
do $$
declare n int;
begin
  select count(*) into n from public.accounts       where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  if n <> 0 then raise exception 'FAIL: B read % of A''s accounts', n; end if;
  select count(*) into n from public.invoice_lines  where id = 'd1111111-1111-1111-1111-111111111111';
  if n <> 0 then raise exception 'FAIL: B read % of A''s invoice_lines (parent-scoped policy leaked)', n; end if;
  select count(*) into n from public.profiles       where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if n <> 0 then raise exception 'FAIL: B read % of A''s profile rows', n; end if;
  raise notice 'PASS: cross-user SELECT denied (accounts, invoice_lines, profiles)';
end $$;

-- 2b) UPDATE — B's update must affect 0 of A's rows.
do $$
declare n int;
begin
  update public.accounts set name = 'HACKED-BY-B'
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B updated % of A''s accounts', n; end if;

  update public.invoice_lines set description = 'HACKED'
    where id = 'd1111111-1111-1111-1111-111111111111';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B updated % of A''s invoice_lines', n; end if;

  raise notice 'PASS: cross-user UPDATE denied (0 rows affected)';
end $$;

-- 2c) DELETE — B's delete must affect 0 of A's rows.
do $$
declare n int;
begin
  delete from public.accounts      where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B deleted % of A''s accounts', n; end if;

  delete from public.invoice_lines where id = 'd1111111-1111-1111-1111-111111111111';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B deleted % of A''s invoice_lines', n; end if;

  raise notice 'PASS: cross-user DELETE denied (0 rows affected)';
end $$;

-- 2d) INSERT forging A's ownership — must be blocked by WITH CHECK.
do $$
declare blocked boolean := false;
begin
  begin
    insert into public.accounts (user_id, name, type, balance)
      values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'forged by B', 'checking', 0);
  exception when others then
    blocked := true;  -- expected: new row violates row-level security policy
  end;
  if not blocked then raise exception 'FAIL: B inserted a row owned by A'; end if;
  raise notice 'PASS: cross-user INSERT (forged user_id) blocked by WITH CHECK';
end $$;

-- 2e) INSERT into an invoice_lines belonging to A's invoice — must be blocked.
do $$
declare blocked boolean := false;
begin
  begin
    insert into public.invoice_lines (invoice_id, description, quantity, unit_price)
      values ('11111111-1111-1111-1111-111111111111', 'B injecting a line', 1, 50);
  exception when others then
    blocked := true;
  end;
  if not blocked then raise exception 'FAIL: B added a line to A''s invoice'; end if;
  raise notice 'PASS: cross-user INSERT into A''s invoice_lines blocked';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Back to USER A: prove the data is untouched by B's attempts.
-- ─────────────────────────────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
do $$
declare nm text; ln text;
begin
  select name        into nm from public.accounts      where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  select description  into ln from public.invoice_lines where id = 'd1111111-1111-1111-1111-111111111111';
  if nm is distinct from 'A secret checking' then raise exception 'FAIL: A''s account was modified: %', nm; end if;
  if ln is distinct from 'A line item'       then raise exception 'FAIL: A''s invoice line was modified: %', ln; end if;
  raise notice 'PASS: A''s data intact after B''s attacks (account=%, line=%)', nm, ln;
end $$;

reset role;
rollback;   -- leave the database exactly as it was — nothing above persists

-- Expected output: a series of "PASS: …" NOTICE lines and no errors.
