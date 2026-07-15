# Vallety

Dark-themed, euro-first personal-finance app (React 19 + TypeScript + Vite, Supabase auth).

## Authentication & redirect URLs

Auth redirect URLs are **environment-aware**: the app always builds them from
`window.location.origin` (see `src/shared/lib/authRedirect.ts`), so confirmation,
magic-link and OAuth emails point at whichever host the app is running on —
`http://localhost:5173` in dev, the production domain when deployed. There is no
hardcoded URL anywhere.

- Confirmation / magic-link / OAuth links land on **`/auth/callback`**
  (`AuthCallbackPage`), which completes the Supabase session exchange (PKCE
  `?code=` or implicit hash), then routes **new users → `/onboarding`** and
  **returning users → `/`**.
- Password-reset links land on **`/reset-password`** so the user sets a new
  password before entering the app.

### Required Supabase dashboard settings

In **Authentication → URL Configuration**:

- **Site URL** — set to the **production domain** (e.g. `https://vallety.vercel.app`).
  This is the default used when a specific redirect isn't allow-listed, so it must
  be production, never localhost.
- **Redirect URLs** — allow-list **both** the production and local dev origins,
  including the callback paths:
  - `https://vallety.vercel.app/auth/callback`
  - `https://vallety.vercel.app/reset-password`
  - `http://localhost:5173/auth/callback`
  - `http://localhost:5173/reset-password`
  - (add any Vercel preview domains you test on)

Without the production entries, confirmation emails sent from prod would fall back
to the Site URL; without the localhost entries, dev sign-ups would be rejected.

---

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
