// Supabase Edge Function: delete-account
//
// GDPR "right to erasure". Runs with the service_role key (server-side only —
// the key never touches the client). It:
//   1. Verifies the caller's JWT and resolves their user id.
//   2. Deletes their Storage objects (avatars/<uid>/…, receipts/<uid>/…).
//   3. Removes their premium_waitlist rows (FK is set-null on user delete, so
//      the email would otherwise be orphaned).
//   4. Deletes the auth user, which cascades to profiles and every user-scoped
//      table via `on delete cascade`.
//
// Deploy:  supabase functions deploy delete-account
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
})

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...cors(origin), 'Content-Type': 'application/json' },
    })
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization') ?? ''

  // 1. Identify the caller from their JWT (never trust a body-supplied id).
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const { data: { user }, error: userErr } = await asUser.auth.getUser()
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401, headers: { ...cors(origin), 'Content-Type': 'application/json' },
    })
  }
  const uid = user.id

  // 2+. Everything below uses the service role.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Storage: remove the user's folder in each bucket.
  for (const bucket of ['avatars', 'receipts']) {
    try {
      const { data: files } = await admin.storage.from(bucket).list(uid, { limit: 1000 })
      if (files?.length) {
        await admin.storage.from(bucket).remove(files.map((f) => `${uid}/${f.name}`))
      }
    } catch { /* bucket may not exist / be empty — continue */ }
  }

  // premium_waitlist FK is on-delete-set-null, so clear it explicitly.
  try { await admin.from('premium_waitlist').delete().eq('user_id', uid) } catch { /* ignore */ }

  // Delete the auth user → cascades profiles and every user_id table.
  const { error: delErr } = await admin.auth.admin.deleteUser(uid)
  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), {
      status: 500, headers: { ...cors(origin), 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { ...cors(origin), 'Content-Type': 'application/json' },
  })
})
