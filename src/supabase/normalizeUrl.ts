/**
 * Normalise VITE_SUPABASE_URL to the bare project ORIGIN (scheme + host).
 *
 * supabase-js appends its own service paths ("/auth/v1/signup", "/rest/v1/…"),
 * so the base must be JUST the origin. Two common misconfigurations break auth:
 *   - a trailing slash → ".../auth/v1//signup" (double slash) →
 *     "Invalid path specified in request URL"
 *   - pasting the REST endpoint ".../rest/v1" → ".../rest/v1/auth/v1/signup"
 *     → 404 Not Found
 * `new URL(...).origin` fixes both: it discards any path, query and trailing
 * slash, keeping only "https://<ref>.supabase.co".
 */
export function normalizeSupabaseUrl(
  raw: string | undefined,
  onPathWarning?: (pathname: string, origin: string) => void,
): string {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return ''
  try {
    const { origin, pathname } = new URL(trimmed)
    if (pathname && pathname !== '/') onPathWarning?.(pathname, origin)
    return origin
  } catch {
    return trimmed.replace(/\/+$/, '')
  }
}
