// Supabase-backed profile persistence + shared-state sync.
//
// The profile was historically local-first (localStorage). This layer makes
// the Supabase `profiles` row authoritative so changes persist across sessions
// and devices, AND immediately reflects mirrored fields (name, avatar,
// currency, mode) into the auth store so the sidebar/header update without a
// refresh.

import { supabase } from '../../supabase/client'
import { useAuthStore } from '../store/authStore'
import { readProfile, PROFILE_KEY, type ValletyProfile } from './profile'
import type { Profile, BusinessType, CurrencyCode, AppMode } from '../../supabase/types'

/** App-side patch, widened with fields that live outside ValletyProfile
 *  (avatar_url on the row, active_mode in the app store). */
export type ProfileSavePatch = Partial<ValletyProfile> & {
  avatar_url?: string | null
  active_mode?: AppMode
}

// Extended columns (phone/municipality/language, migration 006) aren't in the
// generated Update type yet, so address the table through an untyped view for
// the profile update — same pattern as billing.ts.
const db = supabase as unknown as {
  from: (t: string) => {
    update: (v: Record<string, unknown>) => {
      eq: (c: string, val: string) => {
        select: () => { single: () => Promise<{ data: unknown; error: { message: string } | null }> }
      }
    }
  }
}

// App business_type values → Supabase enum.
const BUSINESS_TYPE_TO_DB: Record<string, BusinessType | null> = {
  '': null,
  toiminimi: 'sole_proprietor',
  freelancer: 'sole_proprietor',
  oy: 'llc',
  kevytyrittaja: 'other',
}

// Reverse map (DB enum → the closest app value) for hydrating on load. The
// forward map is lossy (toiminimi & freelancer both → sole_proprietor), so the
// local value is preferred when present; this is only a fresh-device fallback.
const DB_TO_BUSINESS_TYPE: Partial<Record<BusinessType, ValletyProfile['business_type']>> = {
  sole_proprietor: 'toiminimi',
  llc: 'oy',
  other: 'kevytyrittaja',
}

// The DB currency enum is a fixed set; codes outside it (SEK/NOK/DKK/PLN) stay
// local-only until the enum is widened (see supabase/migrations/006_profile_extended.sql).
const DB_CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'MXN']

/** Columns guaranteed to exist on `profiles` today. */
type CoreDbPatch = Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'active_mode' | 'currency' | 'business_type' | 'business_name'>>
/** Columns added by migration 006 (best-effort until applied). */
interface ExtendedDbPatch { phone?: string; municipality?: string; language?: string }

/** Translate an app profile patch into DB column patches (core + extended). */
function mapToDb(patch: ProfileSavePatch): { core: CoreDbPatch; extended: ExtendedDbPatch } {
  const core: CoreDbPatch = {}
  const extended: ExtendedDbPatch = {}
  if ('full_name' in patch) core.full_name = patch.full_name ?? ''
  if ('avatar_url' in patch) core.avatar_url = patch.avatar_url ?? null
  if ('active_mode' in patch && patch.active_mode) core.active_mode = patch.active_mode
  if ('home_currency' in patch && patch.home_currency && DB_CURRENCIES.includes(patch.home_currency as CurrencyCode)) {
    core.currency = patch.home_currency as CurrencyCode
  }
  if ('business_type' in patch) core.business_type = BUSINESS_TYPE_TO_DB[patch.business_type ?? ''] ?? null
  if ('business_name' in patch) core.business_name = patch.business_name ?? null
  if ('phone' in patch) extended.phone = patch.phone
  if ('municipality' in patch) extended.municipality = patch.municipality
  if ('language' in patch) extended.language = patch.language
  return { core, extended }
}

/** Read the raw stored profile object (used to tell "unset" from "default"). */
function rawStored(): Record<string, unknown> {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/**
 * Merge a Supabase profile row into the local profile. The DB is authoritative
 * for cleanly round-tripping fields (name/email/avatar/phone/municipality/
 * language/business_name); currency and business_type are lossy in the DB, so
 * the local value wins when it exists and the DB is only a fresh-device fallback.
 */
export function mergeDbIntoLocal(dbProfile: Profile | null): ValletyProfile {
  const local = readProfile()
  if (!dbProfile) return local
  const ext = dbProfile as unknown as Record<string, unknown>
  const stored = rawStored()

  const merged: ValletyProfile = { ...local }
  if (dbProfile.full_name != null) merged.full_name = dbProfile.full_name
  if (dbProfile.email) merged.email = dbProfile.email
  merged.avatar_url = dbProfile.avatar_url ?? merged.avatar_url ?? null
  if (dbProfile.business_name != null) merged.business_name = dbProfile.business_name
  if (typeof ext.phone === 'string') merged.phone = ext.phone
  if (typeof ext.municipality === 'string') merged.municipality = ext.municipality
  if (typeof ext.language === 'string' && ['en', 'fi', 'sv'].includes(ext.language)) {
    merged.language = ext.language as ValletyProfile['language']
  }
  // Currency: adopt the DB value only when nothing was stored locally, so a
  // locally-set SEK/NOK/etc. (unrepresentable in the DB enum) isn't clobbered.
  if (!('home_currency' in stored) && dbProfile.currency) merged.home_currency = dbProfile.currency
  // Business type: same reasoning — the forward map is lossy.
  if (!('business_type' in stored) && dbProfile.business_type) {
    merged.business_type = DB_TO_BUSINESS_TYPE[dbProfile.business_type] ?? merged.business_type
  }
  return merged
}

/** Optimistically merge mirrored fields into the shared auth-store profile so
 *  the sidebar/header/profile header update instantly (before the round-trip). */
export function applyOptimisticProfile(patch: ProfileSavePatch): void {
  const cur = useAuthStore.getState().profile
  if (!cur) return
  const { core } = mapToDb(patch)
  if (Object.keys(core).length === 0) return
  useAuthStore.getState().setProfile({ ...cur, ...core })
}

export interface SaveResult { ok: boolean; skipped?: boolean; error?: string }

/**
 * Persist a profile patch to Supabase and reconcile the auth store with the
 * saved row. Returns { skipped } when there's no authenticated user (local-only
 * mode — not an error). Retries with core columns only if the extended columns
 * aren't present yet, so a pre-migration deploy still persists the essentials.
 */
export async function saveProfileToSupabase(patch: ProfileSavePatch): Promise<SaveResult> {
  const { user } = useAuthStore.getState()
  if (!user) return { ok: true, skipped: true } // not signed in → localStorage is the store

  const { core, extended } = mapToDb(patch)
  const full = { ...core, ...extended }
  if (Object.keys(full).length === 0) return { ok: true, skipped: true }

  const run = (p: Record<string, unknown>) =>
    db.from('profiles').update(p).eq('id', user.id).select().single()

  try {
    let { data, error } = await run(full)
    // Extended columns may not exist yet (migration not applied) → retry core.
    if (error && Object.keys(extended).length > 0 && Object.keys(core).length > 0) {
      console.warn('[profile] extended columns rejected, retrying core only:', error.message)
      ;({ data, error } = await run(core))
    }
    if (error) {
      console.error('[profile] save failed:', error.message)
      return { ok: false, error: error.message }
    }
    if (data) useAuthStore.getState().setProfile(data as Profile)
    return { ok: true }
  } catch (e) {
    console.error('[profile] save request failed:', e)
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

// ── Avatar (Supabase Storage 'avatars' bucket) ────────────────────────────────

const AVATAR_BUCKET = 'avatars'

interface StorageBucket {
  upload: (path: string, file: File, opts?: { upsert?: boolean; contentType?: string }) => Promise<{ error: { message: string } | null }>
  getPublicUrl: (path: string) => { data: { publicUrl: string } }
  remove: (paths: string[]) => Promise<{ error: { message: string } | null }>
}
const storage = supabase as unknown as { storage: { from: (b: string) => StorageBucket } }

export interface AvatarResult extends SaveResult { url?: string | null }

function extFor(file: File): string {
  const fromType = file.type.split('/')[1]
  if (fromType) return fromType.replace('jpeg', 'jpg')
  const fromName = file.name.split('.').pop()
  return fromName && fromName.length <= 5 ? fromName.toLowerCase() : 'png'
}

/** Read a File as a base64 data URL (local-only fallback when signed out). */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

/**
 * Upload an avatar image. Signed in → Supabase Storage ('avatars' bucket),
 * public URL saved to profile.avatar_url. Signed out → base64 data URL kept in
 * the local profile only. Reflects instantly via the auth store on success.
 */
export async function uploadAvatar(file: File): Promise<AvatarResult> {
  const { user } = useAuthStore.getState()

  if (!user) {
    // Local-only mode: base64 in the profile (kept small by the caller's guard).
    try {
      const url = await readAsDataUrl(file)
      return { ok: true, skipped: true, url }
    } catch {
      return { ok: false, error: 'Could not read the image file.' }
    }
  }

  const path = `${user.id}/avatar.${extFor(file)}`
  try {
    const { error: upErr } = await storage.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type || 'image/png' })
    if (upErr) {
      console.error('[avatar] upload failed:', upErr.message)
      return { ok: false, error: upErr.message }
    }
    const { publicUrl } = storage.storage.from(AVATAR_BUCKET).getPublicUrl(path).data
    // Cache-bust so the new image shows immediately (same path, upsert).
    const url = `${publicUrl}?t=${Date.now()}`
    const res = await saveProfileToSupabase({ avatar_url: url })
    return { ...res, url }
  } catch (e) {
    console.error('[avatar] upload request failed:', e)
    return { ok: false, error: e instanceof Error ? e.message : 'Upload failed' }
  }
}

/** Clear the avatar: null out profile.avatar_url (and best-effort delete files). */
export async function removeAvatar(): Promise<AvatarResult> {
  const { user } = useAuthStore.getState()
  if (user) {
    // Files are small and named per-extension; remove the common ones, ignore misses.
    try {
      await storage.storage
        .from(AVATAR_BUCKET)
        .remove(['png', 'jpg', 'jpeg', 'webp', 'gif'].map((e) => `${user.id}/avatar.${e}`))
    } catch {
      /* ignore — the authoritative change is nulling avatar_url below */
    }
  }
  const res = await saveProfileToSupabase({ avatar_url: null })
  return { ...res, url: null }
}
