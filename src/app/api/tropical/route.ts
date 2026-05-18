import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface TropicalData {
  cape: number
  liftedIndex: number
  shear: number          // approximated from 10m vs pressure
  sst: number            // sea surface temperature proxy (°C)
  sstAnomaly: number     // deviation from 26°C threshold
  formationIndex: number // 0–100 cyclogenesis potential
  category: 'negligible' | 'low' | 'moderate' | 'elevated' | 'high'
  season: boolean        // is it hurricane season?
  distance: number       // rough km from tropical belt
  tips: string[]
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const latN = parseFloat(lat)

  // Tropical cyclone zone: 5°–25° N or S, hurricane season Jun–Nov (N), Dec–Apr (S)
  const now = new Date()
  const month = now.getMonth() + 1
  const isNH = latN >= 0
  const season = isNH
    ? month >= 6 && month <= 11
    : month >= 12 || month <= 4
  const distanceFromTropics = Math.max(0, Math.abs(latN) - 25)

  // Fetch atmospheric instability
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('hourly', ['cape', 'lifted_index', 'surface_pressure', 'wind_speed_10m'].join(','))
  url.searchParams.set('forecast_days', '1')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const json = await res.json()

  const cape = json.hourly?.cape?.[12] ?? 0       // noon value
  const li = json.hourly?.lifted_index?.[12] ?? 5
  const wind = json.hourly?.wind_speed_10m?.[12] ?? 10

  // SST proxy: use surface temp + ocean offset
  // Real SST would need separate API; approximate with air temp + bias
  const sst = parseFloat((25 + (Math.abs(latN) < 20 ? 3 : 0) - Math.abs(latN) * 0.1).toFixed(1))
  const sstAnomaly = parseFloat((sst - 26).toFixed(1))

  // Cyclogenesis index (simplified):
  // - SST > 26°C: +40
  // - CAPE > 1000 J/kg: +20
  // - LI < -4: +20
  // - In season: +15
  // - In tropics: +5 (reduced with distance)
  // - Low wind shear proxy (wind < 30 km/h): +5
  let fi = 0
  if (sst > 26) fi += Math.min(40, (sst - 26) * 15)
  if (cape > 500) fi += Math.min(20, (cape / 1000) * 20)
  if (li < -2) fi += Math.min(20, (-li - 2) * 5)
  if (season) fi += 15
  if (distanceFromTropics === 0) fi += 5
  if (wind < 30) fi += 5
  fi = Math.round(Math.max(0, Math.min(100, fi - distanceFromTropics * 0.8)))

  const category: TropicalData['category'] = fi >= 70 ? 'high' : fi >= 50 ? 'elevated' : fi >= 30 ? 'moderate' : fi >= 10 ? 'low' : 'negligible'

  const tips: string[] = []
  if (fi > 50) tips.push('Vigilar avisos del servicio meteorológico nacional')
  if (distanceFromTropics > 20) tips.push('Ubicación fuera de la zona de formación directa')
  if (!season) tips.push('Fuera de temporada de ciclones para este hemisferio')
  if (sst < 26) tips.push(`TSM ${sst}°C < 26°C — umbral mínimo de intensificación no alcanzado`)
  if (tips.length === 0) tips.push('Mantener vigilancia durante toda la temporada de ciclones')

  return NextResponse.json({
    cape: Math.round(cape),
    liftedIndex: parseFloat(li.toFixed(1)),
    shear: parseFloat(wind.toFixed(1)),
    sst,
    sstAnomaly,
    formationIndex: fi,
    category,
    season,
    distance: Math.round(distanceFromTropics),
    tips,
  } satisfies TropicalData)
}
