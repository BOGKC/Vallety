/**
 * Cross-user RLS integration test — runs against a LIVE Supabase project.
 *
 * Proves at the API level that a logged-in user B cannot read, update, delete,
 * or forge the rows of user A — across EVERY user-scoped table. This is the
 * end-to-end complement to docs/migrations/rls_test_all_tables.sql (which proves
 * the same thing inside the DB).
 *
 * Run:
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_ANON_KEY=<anon key> \
 *   SUPABASE_SERVICE_ROLE_KEY=<service role key> \
 *   node tests/rls/cross-user-rls.mjs
 *
 * The service-role key is used ONLY to create/confirm the two throwaway users,
 * seed A's rows, independently verify A's data is untouched, and clean up. Every
 * ATTACK is performed with the ANON key + user B's own JWT, exactly like a real
 * browser client — so it exercises the real RLS path.
 *
 * Exit code 0 = all checks passed; 1 = a check failed or setup errored.
 * Any table where B succeeds is printed as "FAIL: <table> ...".
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

// today's date as YYYY-MM-DD (schema uses date columns in several tables)
const today = new Date().toISOString().slice(0, 10)

let aId, bId
const cleanupIds = { accounts: [], portfolios: [], business_clients: [], invoices: [] }

try {
  aId = await createConfirmedUser(A)
  bId = await createConfirmedUser(B)
  const bClient = await signIn(B)

  // ── Seed one row per table OWNED BY A, using the service role (bypasses RLS).
  // Parents first so FK-scoped children (transactions, invoice_lines, holdings…)
  // can reference them. Each seed returns the row's id so we can target it.
  const seed = async (table, row) => {
    const { data, error } = await admin.from(table).insert({ user_id: aId, ...row }).select().single()
    if (error) throw new Error(`seed ${table}: ${error.message}`)
    return data
  }

  const acct = await seed('accounts', { name: 'A secret checking', type: 'checking', balance: 1234.56 })
  const client = await seed('business_clients', { name: 'A client' })
  const invoice = await seed('invoices', {
    client_id: client.id, invoice_number: `A-${Date.now()}`, due_date: today,
  })
  const port = await seed('portfolios', { name: 'A portfolio' })
  cleanupIds.accounts.push(acct.id)
  cleanupIds.business_clients.push(client.id)
  cleanupIds.invoices.push(invoice.id)
  cleanupIds.portfolios.push(port.id)

  // invoice_lines has NO user_id — it is scoped through its parent invoice.
  const { data: lineRow, error: lineErr } = await admin.from('invoice_lines')
    .insert({ invoice_id: invoice.id, description: 'line', unit_price: 10 }).select().single()
  if (lineErr) throw new Error(`seed invoice_lines: ${lineErr.message}`)

  // Tables keyed by user_id, with a minimal valid row each.
  const userScoped = [
    ['accounts', acct.id],
    ['transactions', (await seed('transactions', { account_id: acct.id, type: 'expense', amount: 10, description: 'x', category: 'Groceries', date: today })).id],
    ['budgets', (await seed('budgets', { category: 'Food', amount: 100 })).id],
    ['goals', (await seed('goals', { name: 'Trip', target_amount: 1000 })).id],
    ['bills', (await seed('bills', { name: 'Rent', amount: 500, due_day: 1, category: 'Housing' })).id],
    ['debts', (await seed('debts', { name: 'Loan', type: 'personal_loan', original_balance: 100, current_balance: 50 })).id],
    ['net_worth_snapshots', (await seed('net_worth_snapshots', { snapshot_date: today })).id],
    ['business_clients', client.id],
    ['invoices', invoice.id],
    ['business_expenses', (await seed('business_expenses', { category: 'software', description: 'x', amount: 10, date: today })).id],
    ['mileage_log', (await seed('mileage_log', { date: today, purpose: 'biz', from_location: 'A', to_location: 'B', miles: 10, rate_per_mile: 0.5 })).id],
    ['tax_payments', (await seed('tax_payments', { type: 'estimated_quarterly', amount: 10, payment_date: today, tax_year: 2026 })).id],
    ['portfolios', port.id],
    ['holdings', (await seed('holdings', { portfolio_id: port.id, symbol: 'AAPL', name: 'Apple', asset_class: 'stock' })).id],
    ['investment_transactions', (await seed('investment_transactions', { portfolio_id: port.id, type: 'buy', symbol: 'AAPL', total_amount: 100, date: today })).id],
    ['watchlist', (await seed('watchlist', { symbol: 'TSLA', name: 'Tesla' })).id],
  ]

  // ── ATTACK: as B, prove no access to A's rows in every table.
  for (const [table, id] of userScoped) {
    const sel = await bClient.from(table).select('*').eq('id', id)
    record(`B cannot SELECT A's ${table}`, !sel.error && Array.isArray(sel.data) && sel.data.length === 0,
      sel.error ? `error ${sel.error.message}` : `rows=${sel.data?.length}`)

    const upd = await bClient.from(table).update({ user_id: aId }).eq('id', id).select()
    record(`B cannot UPDATE A's ${table}`, !upd.error && Array.isArray(upd.data) && upd.data.length === 0,
      `affected=${upd.data?.length ?? 'n/a'}`)

    const del = await bClient.from(table).delete().eq('id', id).select()
    record(`B cannot DELETE A's ${table}`, !del.error && Array.isArray(del.data) && del.data.length === 0,
      `affected=${del.data?.length ?? 'n/a'}`)
  }

  // invoice_lines (parent-scoped, no user_id column)
  {
    const sel = await bClient.from('invoice_lines').select('*').eq('id', lineRow.id)
    record("B cannot SELECT A's invoice_lines (parent-scoped)",
      !sel.error && Array.isArray(sel.data) && sel.data.length === 0,
      sel.error ? `error ${sel.error.message}` : `rows=${sel.data?.length}`)
    const del = await bClient.from('invoice_lines').delete().eq('id', lineRow.id).select()
    record("B cannot DELETE A's invoice_lines (parent-scoped)",
      !del.error && Array.isArray(del.data) && del.data.length === 0, `affected=${del.data?.length ?? 'n/a'}`)
  }

  // profiles: B cannot read A's profile row
  {
    const sel = await bClient.from('profiles').select('*').eq('id', aId)
    record("B cannot SELECT A's profile", !sel.error && Array.isArray(sel.data) && sel.data.length === 0,
      sel.error ? `error ${sel.error.message}` : `rows=${sel.data?.length}`)
  }

  // profiles: B cannot escalate its OWN plan (010 billing-column lock)
  {
    await bClient.from('profiles').update({ plan: 'all_access', plan_status: 'active' }).eq('id', bId)
    const { data } = await admin.from('profiles').select('plan').eq('id', bId).single()
    record("B cannot self-grant a paid plan", data?.plan === 'free' || data?.plan == null,
      `plan=${data?.plan}`)
  }

  // Forged insert: B cannot create a row owned by A (WITH CHECK)
  {
    const { error } = await bClient.from('accounts')
      .insert({ user_id: aId, name: 'forged by B', type: 'checking', balance: 0 })
    record("B cannot INSERT a row owned by A", !!error, error ? error.message : 'insert unexpectedly succeeded')
  }

  // Independent service-role check: A's seed row is intact.
  {
    const { data, error } = await admin.from('accounts').select('name').eq('id', acct.id).single()
    record("A's account is intact after B's attacks", !error && data?.name === 'A secret checking',
      error ? `error ${error.message}` : `name="${data?.name}"`)
  }
} catch (e) {
  record('setup / execution', false, e.message)
} finally {
  // Deleting the users cascades their rows (on delete cascade on user_id FKs).
  if (aId) await admin.auth.admin.deleteUser(aId).catch(() => {})
  if (bId) await admin.auth.admin.deleteUser(bId).catch(() => {})
}

const failed = results.filter((r) => !r.passed)
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`)
if (failed.length) {
  console.log('\nTABLES/CHECKS WHERE AN ATTACK SUCCEEDED:')
  failed.forEach((r) => console.log(`  - ${r.name}${r.detail ? ' — ' + r.detail : ''}`))
}
process.exit(failed.length ? 1 : 0)
