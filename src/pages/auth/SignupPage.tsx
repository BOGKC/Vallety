import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from '../../components/Toast'
import { Eye, EyeOff, Mail } from 'lucide-react'
import { ValletyLockup } from '../../components/ValletyLogo'
import { authCallbackUrl } from '../../shared/lib/authRedirect'
import { supabase } from '../../supabase/client'
import { useAuthStore } from '../../shared/store/authStore'
import { LoadingSpinner } from '../../shared/components/LoadingSpinner'

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type FormValues = z.infer<typeof schema>

export function SignupPage() {
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const initialized = useAuthStore((s) => s.initialized)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  // When Supabase requires email confirmation, signUp returns no session; we
  // show a "check your inbox" screen instead of pushing into onboarding.
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null)

  // Already signed in (e.g. returning from Google OAuth): go straight in.
  useEffect(() => {
    if (initialized && session && !confirmEmail) navigate('/', { replace: true })
  }, [initialized, session, confirmEmail, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    const emailRedirectTo = authCallbackUrl()

    let result
    try {
      result = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.fullName },
          emailRedirectTo,
        },
      })
    } catch (e) {
      // A rejected fetch (DNS/offline/CORS) throws rather than returning an
      // error object — surface it legibly instead of a raw "Failed to fetch".
      console.error('[auth] signUp request failed to reach Supabase:', e)
      toast.error(
        "Couldn't reach the server. Check your connection — if it keeps happening, the app's Supabase URL is misconfigured.",
      )
      return
    }

    const { data, error } = result
    if (error) {
      // Don't echo the raw provider error: "User already registered" would let
      // an attacker enumerate which emails have accounts. For that case show the
      // same "check your email" screen a brand-new signup shows, so the two are
      // indistinguishable. (With "Confirm email" enabled in Supabase — see the
      // security to-do — an existing address already returns an obfuscated
      // success, so this branch is belt-and-braces.)
      if (/already\s*registered|already\s*exists|already\s*in\s*use/i.test(error.message)) {
        setConfirmEmail(values.email)
        return
      }
      toast.error("We couldn't complete sign-up. Please check your details and try again.")
      return
    }

    if (data.session) {
      // Email confirmation is disabled — the user is signed in right away.
      toast.success('Welcome to Vallety!')
      navigate('/onboarding')
    } else {
      setConfirmEmail(values.email)
    }
  }

  if (confirmEmail) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <ValletyLockup size={38} className="justify-center mb-8" />
          <div className="bg-bg-card border border-border rounded-2xl p-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center mx-auto">
              <Mail className="h-6 w-6 text-brand" />
            </div>
            <h1 className="text-text-primary text-xl font-semibold">Confirm your email</h1>
            <p className="text-text-secondary text-sm">
              We sent a confirmation link to <span className="text-text-primary font-medium">{confirmEmail}</span>.
              Click it and you'll be signed in automatically.
            </p>
            <p className="text-text-secondary/70 text-xs">Can't find it? Check your spam folder.</p>
            <Link to="/login" className="inline-block text-brand text-sm hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <ValletyLockup size={38} className="justify-center mb-8" />

        <div className="bg-bg-card border border-border rounded-2xl p-8">
          <h1 className="text-2xl font-semibold text-text-primary mb-1">Create account</h1>
          <p className="text-text-secondary text-sm mb-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand hover:underline">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Full name
              </label>
              <input
                {...register('fullName')}
                type="text"
                autoComplete="name"
                placeholder="Alex Smith"
                className="w-full bg-bg-secondary border border-border rounded-lg px-3.5 py-2.5 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
              />
              {errors.fullName && (
                <p className="text-red-400 text-xs mt-1.5">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-bg-secondary border border-border rounded-lg px-3.5 py-2.5 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className="w-full bg-bg-secondary border border-border rounded-lg px-3.5 py-2.5 pr-10 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  className="w-full bg-bg-secondary border border-border rounded-lg px-3.5 py-2.5 pr-10 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  aria-pressed={showConfirm}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-400 text-xs mt-1.5">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand hover:bg-brand/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors mt-2"
            >
              {isSubmitting && <LoadingSpinner size="sm" />}
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-text-secondary/60 text-xs text-center mt-4">
            By signing up you agree to our terms and privacy policy.
          </p>
        </div>
      </div>
    </div>
  )
}
