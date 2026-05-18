'use client'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocationStore } from '@/stores/location-store'

export function URLLocationLoader() {
  const params = useSearchParams()
  const setLocation = useLocationStore((s) => s.setLocation)

  useEffect(() => {
    const lat = params.get('lat')
    const lon = params.get('lon')
    const name = params.get('name')
    const country = params.get('country') ?? ''

    if (lat && lon && name) {
      setLocation({
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        name: decodeURIComponent(name),
        country,
      })
    }
  }, [params, setLocation])

  return null
}
