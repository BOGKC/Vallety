import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { readProfile } from '../../shared/lib/profile'
import { ValletyMark } from '../../components/ValletyLogo'
import { CircleSpinner } from '../../components/loaders'
import { BrokenShapeIllustration, ErrorActions, PrimaryAction } from '../../components/errors/ErrorState'

/**
 * Landing point for every email/OAuth auth link (confirmation, magic link,
 * OAuth). Supabase appends either a PKCE `?code=…` or an implicit `#access_token=…`
 * to this URL; we complete the exchange, then route:
 *   • new user (never onboarded)  → /onboarding
 *   • returning user              → /
 * A provider error in the URL (expired/invalid link) shows a calm recovery
 * screen rather than a dead end.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    ;(async () => {
      const url = new URL(window.location.href)
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''))

      // 1) Provider-reported error (e.g. link expired) — logged raw, shown friendly.
      const errDesc = url.searchParams.get('error_description') ?? hash.get('error_description')
      if (errDesc) { console.error('[auth] callback error:', errDesc); setError(errDesc); return }

      // 2) PKCE flow: exchange the ?code= for a session. Implicit flow is
      //    auto-handled by the client (detectSessionInUrl), so we just read it.
      const code = url.searchParams.get('code')
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code)
        if (exErr) { console.error('[auth] exchangeCodeForSession failed:', exErr.message); setError(exErr.message); return }
      }

      // 3) Resolve the session (implicit hash may still be settling — poll briefly).
      let session = (await supabase.auth.getSession()).data.session
      for (let i = 0; i < 20 && !session; i++) {
        await new Promise((r) => setTimeout(r, 100))
        session = (await supabase.auth.getSession()).data.session
      }
      if (!session) {
        setError('This link has expired or was already used. Please sign in again.')
        return
      }

      // 4) New vs returning → onboarding or dashboard. Returning = already
      //    onboarded (local flag) OR a synced profile with a chosen mode.
      let returning = readProfile().onboarded
      if (!returning) {
        try {
          const { data } = await supabase
            .from('profiles').select('active_mode').eq('id', session.user.id).maybeSingle()
          returning = !!(data as { active_mode?: string } | null)?.active_mode
        } catch { /* offline / no row — treat as new */ }
      }
      navigate(returning ? '/' : '/onboarding', { replace: true })
    })()
  }, [navigate])

  if (error) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
        role="alert"
      >
        <BrokenShapeIllustration />
        <h1 className="mt-5 text-[20px] font-semibold text-text-primary">This link is invalid or expired</h1>
        <p className="mt-1.5 max-w-sm text-[14px] text-text-secondary">
          Request a fresh sign-in link and try again.
        </p>
        <ErrorActions>
          <PrimaryAction href="/login">Go to login</PrimaryAction>
        </ErrorActions>
      </div>
    )
  }

  // Processing state
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-5 bg-bg-primary"
      role="status"
      aria-live="polite"
    >
      <ValletyMark size={56} />
      <div className="flex items-center gap-2.5">
        <CircleSpinner size={20} />
        <span className="text-[14px] text-text-secondary">Signing you in…</span>
      </div>
    </div>
  )
}
