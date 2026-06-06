import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppMode } from '../types'

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
      setMode: (mode) => set({ mode }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setNotificationCount: (count) => set({ notificationCount: count }),
    }),
    {
      name: 'vallety-app-store',
      // Only persist mode and sidebar state; notification count is runtime-only
      partialize: (s) => ({ mode: s.mode, sidebarCollapsed: s.sidebarCollapsed }),
    }
  )
)
