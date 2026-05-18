import { useQuery } from '@tanstack/react-query'
import type { WeatherData, AirQuality, Earthquake, Location } from '@/types/weather'

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function useWeather(location: Location | null) {
  return useQuery<WeatherData>({
    queryKey: ['weather', location?.lat, location?.lon],
    queryFn: () =>
      fetcher<WeatherData>(
        `/api/weather?lat=${location!.lat}&lon=${location!.lon}&name=${encodeURIComponent(location!.name)}&country=${location!.country}`
      ),
    enabled: !!location,
    refetchInterval: 60_000,
    staleTime: 55_000,
  })
}

export function useAirQuality(location: Location | null) {
  return useQuery<AirQuality>({
    queryKey: ['air-quality', location?.lat, location?.lon],
    queryFn: () =>
      fetcher<AirQuality>(`/api/air-quality?lat=${location!.lat}&lon=${location!.lon}`),
    enabled: !!location,
    refetchInterval: 300_000,
    staleTime: 290_000,
  })
}

export function useEarthquakes(minMag = 2.5, hours = 24) {
  return useQuery<Earthquake[]>({
    queryKey: ['earthquakes', minMag, hours],
    queryFn: () =>
      fetcher<Earthquake[]>(`/api/earthquakes?minMag=${minMag}&hours=${hours}`),
    refetchInterval: 120_000,
    staleTime: 115_000,
  })
}

export function useGeocoding(query: string) {
  return useQuery<Location[]>({
    queryKey: ['geocoding', query],
    queryFn: () =>
      fetcher<Location[]>(`/api/geocoding?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
    staleTime: 3_600_000,
  })
}

export interface HistoryDay {
  date: string
  tempMax: number
  tempMin: number
  precipitation: number
  weatherCode: number
}

export function useWeatherHistory(location: Location | null) {
  return useQuery<HistoryDay[]>({
    queryKey: ['history', location?.lat, location?.lon],
    queryFn: () =>
      fetcher<HistoryDay[]>(`/api/history?lat=${location!.lat}&lon=${location!.lon}`),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
  })
}
