-- 010_billing_and_storage_hardening.sql
-- Run in the Supabase SQL editor (idempotent). Two hardening fixes:
--
--   1. Lock the billing columns (plan / plan_status / plan_renews_at /
--      trial_ends_at) so a client can NEVER self-grant a paid plan. Row-level
--      security already limits a user to their OWN profiles row, but it is not
--      column-aware: without this, an authenticated user could call
--        supabase.from('profiles').update({ plan: 'all_access' })
--      and unlock every paid feature for free. This trigger makes those columns
--      writable only by trusted server roles (the future Stripe webhook using
--      the service_role key), while ordinary profile edits (name, currency,
--      avatar, language…) keep working.
--
--   2. Stop the public 'avatars' bucket from being enumerable. Objects are still
--      served by their public URL (profile pictures render with a plain <img>),
--      but the storage API can no longer LIST every user's avatar folder — which
--      previously let anyone harvest all user IDs.

-- ── 1) Billing columns are server-writable only ──────────────────────────────
create or replace function public.enforce_plan_immutable_by_client()
returns trigger
language plpgsql
-- SECURITY INVOKER (default) is required: it makes current_user resolve to the
-- PostgREST role of the actual caller ('authenticated' / 'anon' for clients,
-- 'service_role' for the webhook). A SECURITY DEFINER function would instead see
-- its owner and the guard would never fire.
as $$
begin
  if current_user in ('authenticated', 'anon') then
    -- Preserve the existing billing values; the rest of the UPDATE still applies.
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

-- ── 2) Avatars bucket: keep public object reads, forbid listing ───────────────
-- The old policy `using (bucket_id = 'avatars')` allowed ANY role (even anon) to
-- list/select every object in the bucket via the storage API, exposing all
-- "<user-id>/avatar.*" paths. Public rendering uses the public object URL, which
-- does not consult this policy, so restricting it to the owner keeps avatars
-- rendering while removing the enumeration vector.
do $$ begin
  drop policy if exists "avatars: public read" on storage.objects;
exception when others then null; end $$;

do $$ begin
  create policy "avatars: owner list"
    on storage.objects for select
    using (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;
