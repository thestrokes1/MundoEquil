import { create } from 'zustand'

export type TimeView = 'today' | 'week' | 'history'

interface NavStore {
  timeView: TimeView
  activeElement: string | null
  activeSubcategory: string | null
  settingsSubcategory: string | null
  setTimeView: (v: TimeView) => void
  toggleElement: (id: string) => void
  toggleSubcategory: (name: string) => void
  setSettingsSubcategory: (name: string | null) => void
}

export const useNavStore = create<NavStore>((set) => ({
  timeView: 'today',
  activeElement: null,
  activeSubcategory: null,
  settingsSubcategory: null,

  setTimeView: (v) => set({ timeView: v, activeElement: null, activeSubcategory: null, settingsSubcategory: null }),

  toggleElement: (id) => set(s => ({
    activeElement: s.activeElement === id ? null : id,
    activeSubcategory: null,
    settingsSubcategory: null,
  })),

  toggleSubcategory: (name) => set(s => ({
    activeSubcategory: s.activeSubcategory === name ? null : name,
    settingsSubcategory: null,
  })),

  setSettingsSubcategory: (name) => set({ settingsSubcategory: name }),
}))
