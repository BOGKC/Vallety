/**
 * Cross-user RLS integration test — runs against a LIVE Supabase project.
 *
 * Proves at the API level that a logged-in user B cannot read, update, delete,
 * or forge the rows of user A. This is the end-to-end complement to
 * docs/migrations/rls_test.sql (which proves the same thing inside the DB).
 *
 * Run:
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_ANON_KEY=<anon key> \
 *   SUPABASE_SERVICE_ROLE_KEY=<service role key> \
 *   node tests/rls/cross-user-rls.mjs
 *
 * The service-role key is used ONLY to create/confirm and later delete the two
 * throwaway test users (and to independently verify A's row is untouched). The
 * actual attack is performed with the ANON key + each user's own JWT, exactly
 * like a real browser client — so it exercises the real RLS path.
 *
 * Exit code 0 = all checks passed; 1 = a check failed or setup errored.
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !ANON || !SERVICE) {
  console.error('Missing env: need SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })

const A = { email: `rls-a+${Date.now()}@test.local`, password: 'Test-pw-A-12345' }
const B = { email: `rls-b+${Date.now()}@test.local`, password: 'Test-pw-B-12345' }

const results = []
const record = (name, passed, detail = '') => {
  results.push({ name, passed, detail })
  console.log(`${passed ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`)
}

async function createConfirmedUser(u) {
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email, password: u.password, email_confirm: true,
  })
  if (error) throw new Error(`createUser ${u.email}: ${error.message}`)
  return data.user.id
}

async function signIn(u) {
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await client.auth.signInWithPassword({ email: u.email, password: u.password })
  if (error) throw new Error(`signIn ${u.email}: ${error.message}`)
  return client
}

let aId, bId, acctId
try {
  aId = await createConfirmedUser(A)
  bId = await createConfirmedUser(B)

  const aClient = await signIn(A)
  const bClient = await signIn(B)

  // A creates an account (own row). Rely on the WITH CHECK; user_id set explicitly.
  {
    const { data, error } = await aClient
      .from('accounts')
      .insert({ user_id: aId, name: 'A secret checking', type: 'checking', balance: 1234.56 })
      .select()
      .single()
    if (error) throw new Error(`A could not create its own account: ${error.message}`)
    acctId = data.id
    record("A can create its own account", true, `id=${acctId}`)
  }

  // B: SELECT A's account → must return zero rows (not an error, just invisible).
  {
    const { data, error } = await bClient.from('accounts').select('*').eq('id', acctId)
    record("B cannot SELECT A's account", !error && Array.isArray(data) && data.length === 0,
      error ? `unexpected error ${error.message}` : `rows=${data?.length}`)
  }

  // B: UPDATE A's account → must affect zero rows.
  {
    const { data, error } = await bClient.from('accounts')
      .update({ name: 'HACKED-BY-B' }).eq('id', acctId).select()
    record("B cannot UPDATE A's account", !error && Array.isArray(data) && data.length === 0,
      `affected=${data?.length ?? 'n/a'}`)
  }

  // B: DELETE A's account → must affect zero rows.
  {
    const { data, error } = await bClient.from('accounts')
      .delete().eq('id', acctId).select()
    record("B cannot DELETE A's account", !error && Array.isArray(data) && data.length === 0,
      `affected=${data?.length ?? 'n/a'}`)
  }

  // B: INSERT a row claiming user_id = A → must be rejected by WITH CHECK.
  {
    const { error } = await bClient.from('accounts')
      .insert({ user_id: aId, name: 'forged by B', type: 'checking', balance: 0 })
    record("B cannot INSERT a row owned by A", !!error, error ? error.message : 'insert unexpectedly succeeded')
  }

  // B: INSERT with no user_id → the default auth.uid() (007) must stamp B, never A.
  {
    const { data, error } = await bClient.from('accounts')
      .insert({ name: 'B own row', type: 'checking', balance: 0 }).select().single()
    const ownedByB = !error && data && data.user_id === bId
    record("B's own insert is stamped with B's id (not A)", ownedByB,
      error ? `error ${error.message}` : `user_id=${data?.user_id}`)
    if (ownedByB) await admin.from('accounts').delete().eq('id', data.id)
  }

  // Independent check with the service role: A's row is present and unmodified.
  {
    const { data, error } = await admin.from('accounts').select('name').eq('id', acctId).single()
    record("A's account is intact after B's attacks", !error && data?.name === 'A secret checking',
      error ? `error ${error.message}` : `name="${data?.name}"`)
  }
} catch (e) {
  record('setup / execution', false, e.message)
} finally {
  // Cleanup — deleting the users cascades their rows.
  if (aId) await admin.auth.admin.deleteUser(aId).catch(() => {})
  if (bId) await admin.auth.admin.deleteUser(bId).catch(() => {})
}

const failed = results.filter((r) => !r.passed)
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`)
process.exit(failed.length ? 1 : 0)
