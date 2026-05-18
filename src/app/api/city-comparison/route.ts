import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface CityComparisonData {
  reference: CityWeather
  cities: CityWeather[]
}

export interface CityWeather {
  name: string
  country: string
  lat: number
  lon: number
  temp: number
  feelsLike: number
  humidity: number
  wind: number
  cloud: number
  condition: string
  conditionIcon: string
  tempDiff: number
}

const COMPARISON_CITIES = [
  { name: 'Nueva York', country: 'US', lat: 40.71, lon: -74.01 },
  { name: 'Londres',    country: 'GB', lat: 51.51, lon: -0.13  },
  { name: 'Tokio',      country: 'JP', lat: 35.69, lon: 139.69 },
  { name: 'Sídney',     country: 'AU', lat: -33.87, lon: 151.21 },
  { name: 'São Paulo',  country: 'BR', lat: -23.55, lon: -46.63 },
  { name: 'Ciudad de México', country: 'MX', lat: 19.43, lon: -99.13 },
  { name: 'Madrid',     country: 'ES', lat: 40.42, lon: -3.70  },
  { name: 'Dubái',      country: 'AE', lat: 25.20, lon: 55.27  },
]

function conditionFromCloud(cloud: number, precip: number, temp: number, wind: number): [string, string] {
  if (precip > 5)      return ['Tormenta', '⛈️']
  if (precip > 1)      return ['Lluvia', '🌧️']
  if (precip > 0)      return ['Lluvia débil', '🌦️']
  if (temp < 0 && cloud > 50) return ['Nevada', '❄️']
  if (cloud > 80)      return ['Muy nublado', '☁️']
  if (cloud > 40)      return ['Parcialmente nublado', '⛅']
  if (wind > 40)       return ['Ventoso', '💨']
  return ['Despejado', '☀️']
}

async function fetchCityWeather(lat: number, lon: number): Promise<{ temp: number; feels: number; humidity: number; wind: number; cloud: number; precip: number }> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,cloud_cover,precipitation&timezone=auto`
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error('upstream')
    const raw = await res.json()
    return {
      temp:     Math.round((raw.current?.temperature_2m ?? 15) * 10) / 10,
      feels:    Math.round((raw.current?.apparent_temperature ?? 15) * 10) / 10,
      humidity: Math.round(raw.current?.relative_humidity_2m ?? 60),
      wind:     Math.round(raw.current?.wind_speed_10m ?? 10),
      cloud:    Math.round(raw.current?.cloud_cover ?? 30),
      precip:   Math.round((raw.current?.precipitation ?? 0) * 10) / 10,
    }
  } catch {
    return { temp: 15, feels: 15, humidity: 60, wind: 10, cloud: 30, precip: 0 }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const name = searchParams.get('name') ?? 'Mi ubicación'
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const latNum = parseFloat(lat)
  const lonNum = parseFloat(lon)

  // Pick 5 comparison cities (exclude the one closest to the reference)
  const sorted = [...COMPARISON_CITIES].sort((a, b) => {
    const da = Math.hypot(a.lat - latNum, a.lon - lonNum)
    const db = Math.hypot(b.lat - latNum, b.lon - lonNum)
    return da - db
  })
  const comparisons = sorted.slice(1, 6)

  const [refWeather, ...cityWeathers] = await Promise.all([
    fetchCityWeather(latNum, lonNum),
    ...comparisons.map(c => fetchCityWeather(c.lat, c.lon)),
  ])

  const toCity = (meta: typeof comparisons[0], w: typeof refWeather, refTemp: number): CityWeather => {
    const [cond, icon] = conditionFromCloud(w.cloud, w.precip, w.temp, w.wind)
    return {
      name: meta.name,
      country: meta.country,
      lat: meta.lat,
      lon: meta.lon,
      temp: w.temp,
      feelsLike: w.feels,
      humidity: w.humidity,
      wind: w.wind,
      cloud: w.cloud,
      condition: cond,
      conditionIcon: icon,
      tempDiff: Math.round((w.temp - refTemp) * 10) / 10,
    }
  }

  const [refCond, refIcon] = conditionFromCloud(refWeather.cloud, refWeather.precip, refWeather.temp, refWeather.wind)
  const reference: CityWeather = {
    name,
    country: '',
    lat: latNum,
    lon: lonNum,
    temp: refWeather.temp,
    feelsLike: refWeather.feels,
    humidity: refWeather.humidity,
    wind: refWeather.wind,
    cloud: refWeather.cloud,
    condition: refCond,
    conditionIcon: refIcon,
    tempDiff: 0,
  }

  return NextResponse.json({
    reference,
    cities: comparisons.map((c, i) => toCity(c, cityWeathers[i], refWeather.temp)),
  } satisfies CityComparisonData)
}
