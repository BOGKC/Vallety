# ⚠️ Superseded — do not use for deployment

These files (`001_profiles.sql` … `005_rls.sql`) are the original scaffolding and
are **out of date**. They are missing the plan/billing columns, the
`premium_waitlist` table, the Storage buckets and policies (avatars/receipts),
and the RLS/billing hardening the app now depends on. Running `supabase db push`
from this directory would produce an **incomplete and less-secure** schema.

**The authoritative schema lives in `docs/migrations/`.** For a fresh project run
the one-shot [`docs/migrations/000_full_setup.sql`](../../docs/migrations/000_full_setup.sql)
in the Supabase SQL editor; for an existing project apply the numbered
`docs/migrations/0NN_*.sql` files in order (most recent:
`010_billing_and_storage_hardening.sql`).

Verify isolation after applying with `docs/migrations/rls_test_all_tables.sql`
(in the SQL editor) or `tests/rls/cross-user-rls.mjs` (against a live project).

These files are kept only for history and will be removed once the project is
migrated onto the Supabase CLI workflow with the full schema.
