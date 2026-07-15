import { describe, it, expect, vi } from 'vitest'
import { normalizeSupabaseUrl } from './normalizeUrl'

describe('normalizeSupabaseUrl', () => {
  const REF = 'https://xwhvyvoxtgemlaujeuty.supabase.co'

  it('passes a clean project URL through unchanged', () => {
    expect(normalizeSupabaseUrl(REF)).toBe(REF)
  })

  it('strips a trailing slash (would cause a double-slash "Invalid path" error)', () => {
    expect(normalizeSupabaseUrl(`${REF}/`)).toBe(REF)
    expect(normalizeSupabaseUrl(`${REF}///`)).toBe(REF)
  })

  it('strips a pasted REST endpoint path (the /rest/v1 → 404 bug)', () => {
    expect(normalizeSupabaseUrl(`${REF}/rest/v1`)).toBe(REF)
    expect(normalizeSupabaseUrl(`${REF}/rest/v1/`)).toBe(REF)
    expect(normalizeSupabaseUrl(`${REF}/auth/v1`)).toBe(REF)
  })

  it('trims whitespace', () => {
    expect(normalizeSupabaseUrl(`  ${REF}  `)).toBe(REF)
  })

  it('warns (once) when the URL carried a path, reporting the origin used', () => {
    const warn = vi.fn()
    normalizeSupabaseUrl(`${REF}/rest/v1`, warn)
    expect(warn).toHaveBeenCalledWith('/rest/v1', REF)
    warn.mockClear()
    normalizeSupabaseUrl(REF, warn)
    expect(warn).not.toHaveBeenCalled()
  })

  it('returns empty string for missing input', () => {
    expect(normalizeSupabaseUrl(undefined)).toBe('')
    expect(normalizeSupabaseUrl('')).toBe('')
  })
})
