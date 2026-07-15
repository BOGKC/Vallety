// Single source of truth for auth redirect URLs. Always built from
// window.location.origin so confirmation / magic-link / OAuth emails point at
// wherever the app is actually running (localhost in dev, the real domain in
// production) — never a hardcoded host.

// window.location.origin is always a clean scheme+host+port with no trailing
// slash (e.g. "https://vallety.vercel.app"), so joining with a single leading
// slash yields a clean absolute URL. We still strip any trailing slash from the
// origin defensively so the result can never contain a double slash.
const origin = (): string => window.location.origin.replace(/\/+$/, '')

/** Where email-confirmation, magic-link and OAuth flows land to exchange the
 *  session. Handled by AuthCallbackPage → onboarding (new) or dashboard.
 *  e.g. production → "https://vallety.vercel.app/auth/callback". */
export const authCallbackUrl = (): string => `${origin()}/auth/callback`

/** Password-reset links land on the reset screen (not the callback) so the
 *  user actually sets a new password before entering the app. */
export const passwordResetUrl = (): string => `${origin()}/reset-password`
