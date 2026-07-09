import { useEffect, useState } from 'react'

/** The beforeinstallprompt event isn't in the standard lib types. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// One captured prompt per page load, held at module scope so the event (which
// can fire before React mounts) isn't lost between hook consumers.
let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // suppress Chrome's default mini-infobar
    deferredPrompt = e as BeforeInstallPromptEvent
    listeners.forEach((fn) => fn())
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    listeners.forEach((fn) => fn())
  })
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iOSDevice = /iPad|iPhone|iPod/.test(ua)
  // iPadOS 13+ reports as Mac; disambiguate by touch support.
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  return (iOSDevice || iPadOS) && isSafari
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag when launched from home screen.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export interface PWAInstall {
  /** True when a native install prompt is available (Android/Chrome). */
  canInstall: boolean
  /** True when already running as an installed PWA. */
  isInstalled: boolean
  /** True on iOS Safari, where install is manual (Share → Add to Home Screen). */
  isIOS: boolean
  /** Trigger the native prompt. Resolves to whether the user accepted. */
  promptInstall: () => Promise<boolean>
}

export function usePWAInstall(): PWAInstall {
  const [canInstall, setCanInstall] = useState(() => deferredPrompt !== null)
  const [isInstalled, setIsInstalled] = useState(isStandalone)
  const isIOS = detectIOS()

  useEffect(() => {
    const sync = () => {
      setCanInstall(deferredPrompt !== null)
      setIsInstalled(isStandalone())
    }
    listeners.add(sync)
    return () => { listeners.delete(sync) }
  }, [])

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    listeners.forEach((fn) => fn())
    return outcome === 'accepted'
  }

  return { canInstall, isInstalled, isIOS, promptInstall }
}
