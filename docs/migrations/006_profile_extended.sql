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
-- Public-read bucket so profile.avatar_url can be rendered with a plain <img>.
-- Writes are restricted to the owner via the policies below (path is
-- "<user-id>/avatar.<ext>", so the first path segment must equal auth.uid()).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone can read (bucket is public).
do $$ begin
  create policy "avatars: public read"
    on storage.objects for select
    using (bucket_id = 'avatars');
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
