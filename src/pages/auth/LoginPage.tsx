import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from '../../components/Toast'
import { Eye, EyeOff, Mail, Wallet } from 'lucide-react'
import { GoogleIcon } from '../../components/GoogleIcon'
import { LoadingSpinner } from '../../shared/components/LoadingSpinner'
import { useAuth } from '../../shared/hooks/useAuth'
import { useAuthStore } from '../../shared/store/authStore'
import { supabase } from '../../supabase/client'

// ── Schemas ───────────────────────────────────────────────────────────────────

const passwordSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

const magicSchema = z.object({
  email: z.string().email('Enter a valid email'),
})

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email'),
})

type PasswordValues = z.infer<typeof passwordSchema>
type MagicValues = z.infer<typeof magicSchema>
type ForgotValues = z.infer<typeof forgotSchema>

type Panel = 'password' | 'magic' | 'forgot'

// Map Supabase's raw auth errors to friendly, actionable copy.
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) {
    return 'Wrong email or password. Try again, or use “Forgot password?”.'
  }
  if (m.includes('email not confirmed')) {
    return 'Your email isn’t confirmed yet — click the link we sent you (check spam), then sign in.'
  }
  if (m.includes('rate limit')) {
    return 'Too many attempts — wait a minute and try again.'
  }
  return message
}

// ── Password panel ────────────────────────────────────────────────────────────

function PasswordPanel({ onForgot, onMagic }: { onForgot: () => void; onMagic: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, signInWithGoogle } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const from = (location.state as { from?: Location })?.from?.pathname ?? '/'

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) })

  const onSubmit = async (values: PasswordValues) => {
    const { error } = await signIn(values.email, values.password)
    if (error) {
      toast.error(friendlyAuthError(error.message))
      return
    }
    navigate(from, { replace: true })
  }

  const handleGoogle = async () => {
    const { error } = await signInWithGoogle()
    if (error) toast.error(error.message)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
        <input
          {...register('email')}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full bg-bg-secondary border border-border rounded-lg px-3.5 py-2.5 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
        />
        {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-text-secondary">Password</label>
          <button type="button" onClick={onForgot} className="text-xs text-brand hover:underline">
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full bg-bg-secondary border border-border rounded-lg px-3.5 py-2.5 pr-10 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary focus-visible:text-text-primary"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-brand hover:bg-brand/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
      >
        {isSubmitting && <LoadingSpinner size="sm" />}
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-bg-card px-2 text-text-secondary">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full bg-bg-secondary hover:bg-bg-secondary/70 border border-border text-text-primary font-medium rounded-lg py-2.5 flex items-center justify-center gap-2.5 transition-colors"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <button
        type="button"
        onClick={onMagic}
        className="w-full bg-bg-secondary hover:bg-bg-secondary/70 border border-border text-text-primary font-medium rounded-lg py-2.5 flex items-center justify-center gap-2.5 transition-colors"
      >
        <Mail className="h-4 w-4 text-text-secondary" />
        Send magic link
      </button>
    </form>
  )
}

// ── Magic link panel ──────────────────────────────────────────────────────────

function MagicPanel({ onBack }: { onBack: () => void }) {
  const { signInWithMagicLink } = useAuth()
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<MagicValues>({ resolver: zodResolver(magicSchema) })

  const onSubmit = async (values: MagicValues) => {
    const { error } = await signInWithMagicLink(values.email)
    if (error) { toast.error(error.message); return }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center py-6 space-y-3">
        <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center mx-auto">
          <Mail className="h-6 w-6 text-brand" />
        </div>
        <h3 className="text-text-primary font-medium">Check your inbox</h3>
        <p className="text-text-secondary text-sm">We sent a magic link to your email. Click it to sign in — no password needed.</p>
        <button onClick={onBack} className="text-brand text-sm hover:underline">Back to sign in</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <p className="text-text-secondary text-sm">Enter your email and we'll send a one-click sign-in link.</p>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
        <input
          {...register('email')}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full bg-bg-secondary border border-border rounded-lg px-3.5 py-2.5 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
        />
        {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-brand hover:bg-brand/90 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
      >
        {isSubmitting && <LoadingSpinner size="sm" />}
        {isSubmitting ? 'Sending…' : 'Send magic link'}
      </button>
      <button type="button" onClick={onBack} className="w-full text-text-secondary text-sm hover:text-text-primary transition-colors">
        ← Back
      </button>
    </form>
  )
}

// ── Forgot password panel ─────────────────────────────────────────────────────

function ForgotPanel({ onBack }: { onBack: () => void }) {
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) })

  const onSubmit = async (values: ForgotValues) => {
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) { toast.error(error.message); return }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center py-6 space-y-3">
        <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center mx-auto">
          <Mail className="h-6 w-6 text-brand" />
        </div>
        <h3 className="text-text-primary font-medium">Reset email sent</h3>
        <p className="text-text-secondary text-sm">Check your inbox for a link to reset your password.</p>
        <button onClick={onBack} className="text-brand text-sm hover:underline">Back to sign in</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <p className="text-text-secondary text-sm">Enter your email and we'll send a password reset link.</p>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
        <input
          {...register('email')}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full bg-bg-secondary border border-border rounded-lg px-3.5 py-2.5 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
        />
        {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-brand hover:bg-brand/90 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
      >
        {isSubmitting && <LoadingSpinner size="sm" />}
        {isSubmitting ? 'Sending…' : 'Send reset link'}
      </button>
      <button type="button" onClick={onBack} className="w-full text-text-secondary text-sm hover:text-text-primary transition-colors">
        ← Back
      </button>
    </form>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function LoginPage() {
  const [panel, setPanel] = useState<Panel>('password')
  const navigate = useNavigate()
  const location = useLocation()
  const session = useAuthStore((s) => s.session)
  const initialized = useAuthStore((s) => s.initialized)

  // Already signed in? Forward into the app. This is what makes magic-link,
  // Google OAuth, and email-confirmation landings seamless: they all redirect
  // back to /login, where the URL token has just created a session — without
  // this, the user would simply see the sign-in form again.
  useEffect(() => {
    if (!initialized || !session) return
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/'
    navigate(from, { replace: true })
  }, [initialized, session, location.state, navigate])

  // Time-aware greeting for the sign-in panel (replaces the old static title).
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  }, [])

  const titles: Record<Panel, string> = {
    password: greeting,
    magic: 'Magic link',
    forgot: 'Reset password',
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-lg bg-brand flex items-center justify-center">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-text-primary">Vallety</span>
        </div>

        <div className="bg-bg-card border border-border rounded-2xl p-8">
          <h1 className="text-2xl font-semibold text-text-primary mb-1">{titles[panel]}</h1>
          {panel === 'password' && (
            <p className="text-text-secondary text-sm mb-6">
              New to Vallety?{' '}
              <Link to="/signup" className="text-brand hover:underline">Create account</Link>
            </p>
          )}
          {panel !== 'password' && <div className="mb-6" />}

          {panel === 'password' && (
            <PasswordPanel onForgot={() => setPanel('forgot')} onMagic={() => setPanel('magic')} />
          )}
          {panel === 'magic' && <MagicPanel onBack={() => setPanel('password')} />}
          {panel === 'forgot' && <ForgotPanel onBack={() => setPanel('password')} />}
        </div>
      </div>
    </div>
  )
}
