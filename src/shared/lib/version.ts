// Single source of truth for the app version. The raw value comes from
// package.json via the Vite define in vite.config.ts — never hardcode a
// version string anywhere else; import from here.

export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION ?? '0.0.0'

/** Display form, always prefixed: "v1.0.0". */
export const APP_VERSION_LABEL = `v${APP_VERSION}`
