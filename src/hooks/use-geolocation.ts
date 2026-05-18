'use client'
import { useState, useCallback } from 'react'
import type { Location } from '@/types/weather'

interface GeoState {
  loading: boolean
  error: string | null
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ loading: false, error: null })

  const detect = useCallback(async (): Promise<Location | null> => {
    if (!navigator.geolocation) {
      setState({ loading: false, error: 'Geolocalización no disponible en este navegador' })
      return null
    }

    setState({ loading: true, error: null })

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords
          try {
            const res = await fetch(`/api/geocoding?lat=${latitude}&lon=${longitude}`)
            const locs: Location[] = await res.json()
            const loc = locs[0] ?? { name: 'Mi ubicación', country: '', lat: latitude, lon: longitude }
            setState({ loading: false, error: null })
            resolve(loc)
          } catch {
            resolve({ name: 'Mi ubicación', country: '', lat: latitude, lon: longitude })
            setState({ loading: false, error: null })
          }
        },
        (err) => {
          setState({ loading: false, error: err.message })
          resolve(null)
        },
        { timeout: 8000, maximumAge: 300_000 }
      )
    })
  }, [])

  return { ...state, detect }
}
