import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BootError } from './components/BootError'
import { initTheme } from './shared/lib/theme'

// Suppress diagnostic console output in production so no caught-exception or
// auth/profile detail ever surfaces in an end user's browser console. Errors
// still reach the ErrorBoundary UI. Kept fully verbose in dev.
if (import.meta.env.PROD) {
  const noop = () => {}
  console.log = noop
  console.debug = noop
  console.info = noop
  console.warn = noop
  console.error = noop
}

// Sync data-theme with the stored preference (the inline script in index.html
// sets it pre-paint; this re-affirms it and wires the "system" OS listener).
initTheme()

const root = createRoot(document.getElementById('root')!)

const hasSupabaseEnv = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)

if (!hasSupabaseEnv) {
  root.render(
    <BootError message="Configuration error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set. Add them to the deployment's environment variables and redeploy." />
  )
} else {
  // Import App only after the env check so its module graph (which evaluates
  // supabase/client.ts) doesn't run when configuration is missing.
  import('./App.tsx')
    .then(({ default: App }) =>
      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      )
    )
    .catch((err: unknown) =>
      root.render(
        <BootError message={err instanceof Error ? err.message : 'Unexpected error while loading the app.'} />
      )
    )
}
