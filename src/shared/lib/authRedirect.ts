// Single source of truth for auth redirect URLs. Always built from
// window.location.origin so confirmation / magic-link / OAuth emails point at
// wherever the app is actually running (localhost in dev, the real domain in
// production) — never a hardcoded host.

/** Where email-confirmation, magic-link and OAuth flows land to exchange the
 *  session. Handled by AuthCallbackPage → onboarding (new) or dashboard. */
export const authCallbackUrl = (): string => `${window.location.origin}/auth/callback`

/** Password-reset links land on the reset screen (not the callback) so the
 *  user actually sets a new password before entering the app. */
export const passwordResetUrl = (): string => `${window.location.origin}/reset-password`
