-- 011_storage_upload_limits.sql — enforce upload type/size at the bucket level.
-- Run in the Supabase SQL editor (idempotent). The client checks file type/size
-- before upload, but that is trivially bypassable by calling the storage API
-- directly — these bucket limits are the real, server-side control so a user
-- can't store an arbitrary or oversized file as an "avatar"/"receipt".

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 4194304, -- 4 MB
        array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, -- 10 MB
        array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do update set
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  public             = false; -- receipts must never be public
