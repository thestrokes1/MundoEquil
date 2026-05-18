import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Location } from '@/types/weather'

interface LocationState {
  location: Location | null
  favorites: Location[]
  unit: 'celsius' | 'fahrenheit'
  speedUnit: 'kmh' | 'mph'
  setLocation: (loc: Location) => void
  addFavorite: (loc: Location) => void
  removeFavorite: (lat: number, lon: number) => void
  isFavorite: (lat: number, lon: number) => boolean
  setUnit: (u: 'celsius' | 'fahrenheit') => void
  setSpeedUnit: (u: 'kmh' | 'mph') => void
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      location: null,
      favorites: [],
      unit: 'celsius',
      speedUnit: 'kmh',
      setLocation: (loc) => set({ location: loc }),
      addFavorite: (loc) => {
        const { favorites } = get()
        const exists = favorites.some((f) => Math.abs(f.lat - loc.lat) < 0.01 && Math.abs(f.lon - loc.lon) < 0.01)
        if (!exists) set({ favorites: [...favorites, loc].slice(0, 8) })
      },
      removeFavorite: (lat, lon) =>
        set((s) => ({
          favorites: s.favorites.filter(
            (f) => !(Math.abs(f.lat - lat) < 0.01 && Math.abs(f.lon - lon) < 0.01)
          ),
        })),
      isFavorite: (lat, lon) =>
        get().favorites.some((f) => Math.abs(f.lat - lat) < 0.01 && Math.abs(f.lon - lon) < 0.01),
      setUnit: (unit) => set({ unit }),
      setSpeedUnit: (speedUnit) => set({ speedUnit }),
    }),
    { name: 'mundoequil-location' }
  )
)
