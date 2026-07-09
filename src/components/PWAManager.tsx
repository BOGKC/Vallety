import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import toast from './Toast'

/**
 * Registers the service worker and surfaces a non-intrusive "new version"
 * toast with a Refresh action instead of silently reloading. On tap it calls
 * updateServiceWorker(true) → skipWaiting + reload. Also mounts the custom
 * install banner is done separately; this component owns updates only.
 */
export function PWAManager() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl) {
      // Poll for a new deployment every hour so long-lived tabs pick it up.
      if (import.meta.env.PROD) {
        window.setInterval(() => {
          navigator.serviceWorker.getRegistration(swUrl).then((r) => r?.update())
        }, 60 * 60 * 1000)
      }
    },
  })

  const shown = useRef(false)

  useEffect(() => {
    if (!needRefresh || shown.current) return
    shown.current = true
    toast.info('A new version of Vallety is available', {
      action: { label: 'Refresh', onClick: () => updateServiceWorker(true) },
      duration: Infinity,
    })
  }, [needRefresh, updateServiceWorker])

  return null
}
