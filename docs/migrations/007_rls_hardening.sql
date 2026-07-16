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
