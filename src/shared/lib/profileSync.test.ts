import { describe, it, expect, vi, beforeEach } from 'vitest'

// The real client calls createClient() at import time and needs env vars, so
// stub it — these tests exercise the pure mapping/merge logic, not the network.
vi.mock('../../supabase/client', () => ({ supabase: {} }))

import { mergeDbIntoLocal } from './profileSync'
import { PROFILE_KEY, DEFAULT_PROFILE, type ValletyProfile } from './profile'
import type { Profile } from '../../supabase/types'

function makeDbProfile(over: Partial<Profile> = {}): Profile {
  return {
    id: 'u1',
    email: 'db@example.com',
    full_name: 'DB Name',
    avatar_url: null,
    active_mode: 'personal',
    currency: 'USD',
    business_name: null,
    business_type: null,
    tax_year_start: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

function storeLocal(patch: Partial<ValletyProfile>) {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(patch))
}

describe('mergeDbIntoLocal', () => {
  beforeEach(() => window.localStorage.clear())

  it('returns the local profile untouched when there is no DB row', () => {
    storeLocal({ full_name: 'Local Only' })
    const merged = mergeDbIntoLocal(null)
    expect(merged.full_name).toBe('Local Only')
  })

  it('DB is authoritative for name / email / avatar', () => {
    storeLocal({ full_name: 'Stale', email: 'stale@example.com' })
    const merged = mergeDbIntoLocal(
      makeDbProfile({ full_name: 'Fresh Name', email: 'fresh@example.com', avatar_url: 'https://x/y.png' }),
    )
    expect(merged.full_name).toBe('Fresh Name')
    expect(merged.email).toBe('fresh@example.com')
    expect(merged.avatar_url).toBe('https://x/y.png')
  })

  it('adopts the DB currency on a fresh device (nothing stored locally)', () => {
    const merged = mergeDbIntoLocal(makeDbProfile({ currency: 'GBP' }))
    expect(merged.home_currency).toBe('GBP')
  })

  it('keeps a locally-set currency the DB enum cannot represent (SEK)', () => {
    storeLocal({ home_currency: 'SEK' })
    const merged = mergeDbIntoLocal(makeDbProfile({ currency: 'EUR' }))
    expect(merged.home_currency).toBe('SEK')
  })

  it('maps the DB business_type back to the closest app value on a fresh device', () => {
    const merged = mergeDbIntoLocal(makeDbProfile({ business_type: 'llc' }))
    expect(merged.business_type).toBe('oy')
  })

  it('preserves the local business_type when one is already stored (lossy forward map)', () => {
    storeLocal({ business_type: 'freelancer' })
    const merged = mergeDbIntoLocal(makeDbProfile({ business_type: 'sole_proprietor' }))
    expect(merged.business_type).toBe('freelancer')
  })

  it('hydrates extended columns (phone / municipality / language) when present', () => {
    const db = makeDbProfile() as unknown as Record<string, unknown>
    db.phone = '+358 40 000'
    db.municipality = 'Espoo'
    db.language = 'fi'
    const merged = mergeDbIntoLocal(db as unknown as Profile)
    expect(merged.phone).toBe('+358 40 000')
    expect(merged.municipality).toBe('Espoo')
    expect(merged.language).toBe('fi')
  })

  it('falls back to defaults for fields absent from both stores', () => {
    const merged = mergeDbIntoLocal(makeDbProfile())
    expect(merged.date_format).toBe(DEFAULT_PROFILE.date_format)
  })
})
