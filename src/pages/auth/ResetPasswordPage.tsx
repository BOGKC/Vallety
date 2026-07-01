import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from '../../components/Toast'
import { Eye, EyeOff, KeyRound, Wallet } from 'lucide-react'
import { LoadingSpinner } from '../../shared/components/LoadingSpinner'
import { useAuthStore } from '../../shared/store/authStore'
import { supabase } from '../../supabase/client'

const schema = z.object({
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

/**
 * Landing page for Supabase password-recovery links. The link's token creates
 * a session on load (detectSessionInUrl); this page then lets the user set a
 * new password and continues straight into the app.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const initialized = useAuthStore((s) => s.initialized)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    const { error } = await supabase.auth.updateUser({ password: values.password })
    if (error) { toast.error(error.message); return }
    toast.success('Password updated — you are signed in.')
    navigate('/', { replace: true })
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
          {!initialized ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : !session ? (
            <div className="text-center py-6 space-y-3">
              <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center mx-auto">
                <KeyRound className="h-6 w-6 text-brand" />
              </div>
              <h1 className="text-text-primary font-medium">Link expired or invalid</h1>
              <p className="text-text-secondary text-sm">
                This reset link is no longer valid. Request a new one from the sign-in page.
              </p>
              <Link to="/login" className="inline-block text-brand text-sm hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-text-primary mb-1">Set a new password</h1>
              <p className="text-text-secondary text-sm mb-6">
                Choose a new password for your account.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">New password</label>
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
                  {errors.password && <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Confirm password</label>
                  <input
                    {...register('confirmPassword')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    className="w-full bg-bg-secondary border border-border rounded-lg px-3.5 py-2.5 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1.5">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-brand hover:bg-brand/90 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
                >
                  {isSubmitting && <LoadingSpinner size="sm" />}
                  {isSubmitting ? 'Saving…' : 'Save new password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
