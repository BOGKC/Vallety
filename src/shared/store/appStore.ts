import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppMode } from '../types'

interface AppState {
  mode: AppMode
  setMode: (mode: AppMode) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      mode: 'personal',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'vallety-app-store' }
  )
)
