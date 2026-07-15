/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** App version, defined from package.json in vite.config.ts. */
  readonly VITE_APP_VERSION: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
