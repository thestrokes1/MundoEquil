import { NextRequest, NextResponse } from 'next/server'

export interface AgroData {
  hourly: {
    time: string[]
    soilTemperature0cm: (number | null)[]
    soilTemperature6cm: (number | null)[]
    soilMoisture: (number | null)[]
    leafWetnessHours: (number | null)[]
    vaporPressureDeficit: (number | null)[]
    snowDepth: (number | null)[]
    snowfall: (number | null)[]
    freezingLevelHeight: (number | null)[]
    evapotranspiration: (number | null)[]
  }
  daily: {
    time: string[]
    precipitationProbability: (number | null)[]
    precipitationSum: (number | null)[]
    snowDepthMax: (number | null)[]
    snowfallSum: (number | null)[]
    etSum: (number | null)[]
    soilTempMax: (number | null)[]
    soilTempMin: (number | null)[]
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'lat y lon requeridos' }, { status: 400 })

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('hourly', [
    'soil_temperature_0cm',
    'soil_temperature_6cm',
    'soil_moisture_0_to_1cm',
    'leaf_wetness_probability',
    'vapour_pressure_deficit',
    'snow_depth',
    'snowfall',
    'freezing_level_height',
    'et0_fao_evapotranspiration',
  ].join(','))
  url.searchParams.set('daily', [
    'precipitation_probability_max',
    'precipitation_sum',
    'snow_depth_max',
    'snowfall_sum',
    'et0_fao_evapotranspiration_sum',
  ].join(','))
  url.searchParams.set('forecast_days', '7')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ error: 'Error' }, { status: 502 })

  const raw = await res.json()
  const h = raw.hourly
  const d = raw.daily

  // Get soil temp min/max per day from hourly
  const soilTempMax: (number | null)[] = []
  const soilTempMin: (number | null)[] = []
  for (let di = 0; di < (d?.time?.length ?? 0); di++) {
    const dayStart = di * 24
    const slice = (h?.soil_temperature_0cm ?? []).slice(dayStart, dayStart + 24).filter((v: number | null) => v !== null) as number[]
    soilTempMax.push(slice.length ? Math.max(...slice) : null)
    soilTempMin.push(slice.length ? Math.min(...slice) : null)
  }

  return NextResponse.json({
    hourly: {
      time: h?.time ?? [],
      soilTemperature0cm: h?.soil_temperature_0cm ?? [],
      soilTemperature6cm: h?.soil_temperature_6cm ?? [],
      soilMoisture: h?.soil_moisture_0_to_1cm ?? [],
      leafWetnessHours: h?.leaf_wetness_probability ?? [],
      vaporPressureDeficit: h?.vapour_pressure_deficit ?? [],
      snowDepth: h?.snow_depth ?? [],
      snowfall: h?.snowfall ?? [],
      freezingLevelHeight: h?.freezing_level_height ?? [],
      evapotranspiration: h?.et0_fao_evapotranspiration ?? [],
    },
    daily: {
      time: d?.time ?? [],
      precipitationProbability: d?.precipitation_probability_max ?? [],
      precipitationSum: d?.precipitation_sum ?? [],
      snowDepthMax: d?.snow_depth_max ?? [],
      snowfallSum: d?.snowfall_sum ?? [],
      etSum: d?.et0_fao_evapotranspiration_sum ?? [],
      soilTempMax,
      soilTempMin,
    },
  } satisfies AgroData)
}
