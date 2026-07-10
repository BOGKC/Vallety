import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Test config is kept separate from vite.config.ts so the PWA plugin (which
// injects a service worker) never runs during tests.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary'],
      // Coverage target is the business logic — the money math where a bug
      // costs a real euro. UI shells/animation are exercised via Playwright.
      include: ['src/shared/lib/**/*.ts'],
      exclude: ['src/shared/lib/**/*.test.ts', 'src/shared/lib/claudeClient.ts', 'src/shared/lib/queryClient.ts'],
    },
  },
})
