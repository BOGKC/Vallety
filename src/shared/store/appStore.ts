import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppMode } from '../types'
import { setModeAccent, ACTIVE_MODE_KEY } from '../lib/modeColors'

interface AppState {
  mode: AppMode
  sidebarCollapsed: boolean
  notificationCount: number
  setMode: (mode: AppMode) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  setNotificationCount: (count: number) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      mode: 'personal',
      sidebarCollapsed: false,
      notificationCount: 0,
      // Switching mode re-themes the whole app: the accent CSS variables are
      // registered @property colors with a 400ms transition, so everything
      // accent-colored (buttons, nav, glows, background) crossfades.
      setMode: (mode) => {
        set({ mode })
        setModeAccent(mode)
        try {
          window.localStorage.setItem(ACTIVE_MODE_KEY, mode)
        } catch {
          /* ignore */
        }
      },
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setNotificationCount: (count) => set({ notificationCount: count }),
    }),
    {
      name: 'vallety-app-store',
      // Only persist mode and sidebar state; notification count is runtime-only
      partialize: (s) => ({ mode: s.mode, sidebarCollapsed: s.sidebarCollapsed }),
      // Apply the persisted mode's accent ramp as soon as the store rehydrates
      // so a business/investment user never flashes personal blue on load.
      onRehydrateStorage: () => (state) => {
        if (state) setModeAccent(state.mode)
      },
    }
  )
)
