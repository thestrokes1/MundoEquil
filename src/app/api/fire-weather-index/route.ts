import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface FireWeatherIndexData {
  fwi: number
  fwiCategory: 'low' | 'moderate' | 'high' | 'very_high' | 'extreme'
  fwiLabel: string
  fwiColor: string
  ffmc: number
  dmc: number
  dc: number
  isi: number
  bui: number
  advice: string
  days: FWIDay[]
}

export interface FWIDay {
  label: string
  fwi: number
  category: FireWeatherIndexData['fwiCategory']
  color: string
  maxTemp: number
  minHumidity: number
  wind: number
  precip: number
}

function fwiCategory(fwi: number): { cat: FireWeatherIndexData['fwiCategory']; label: string; color: string } {
  if (fwi < 5)  return { cat: 'low',       label: 'Bajo',       color: '#22c55e' }
  if (fwi < 12) return { cat: 'moderate',  label: 'Moderado',   color: '#84cc16' }
  if (fwi < 22) return { cat: 'high',      label: 'Alto',       color: '#fbbf24' }
  if (fwi < 38) return { cat: 'very_high', label: 'Muy alto',   color: '#f97316' }
  return               { cat: 'extreme',   label: 'Extremo',    color: '#ef4444' }
}

function canadianFWI(
  temp: number, rh: number, wind: number, rain: number,
  ffmc_prev: number = 85, dmc_prev: number = 6, dc_prev: number = 15,
) {
  // FFMC
  const m0 = 147.2 * (101 - ffmc_prev) / (59.5 + ffmc_prev)
  const rf = rain > 0.5 ? rain - 0.5 : 0
  const mr = m0 + rf ? m0 + 42.5 * rf * Math.exp(-100 / (251 - m0)) * (1 - Math.exp(-6.93 / rf)) : m0
  const Ed = 0.942 * Math.pow(rh, 0.679) + 11 * Math.exp((rh - 100) / 10) + 0.18 * (21.1 - temp) * (1 - Math.exp(-0.115 * rh))
  const Ew = 0.618 * Math.pow(rh, 0.753) + 10 * Math.exp((rh - 100) / 10) + 0.18 * (21.1 - temp) * (1 - Math.exp(-0.115 * rh))
  const m  = mr > Ed ? Ed + (mr - Ed) * Math.pow(0.424 * (1 - Math.pow(rh / 100, 1.7)) + 0.0694 * Math.sqrt(wind) * (1 - Math.pow(rh / 100, 8)), 0.1) : mr
  const ffmc = 59.5 * (250 - m) / (147.2 + m)

  // DMC
  const Le = [6.5,7.5,9,12.8,13.9,13.9,12.4,10.9,9.4,8,7,6][new Date().getMonth()]
  const dmc = rain > 1.5
    ? Math.max(0, dmc_prev + 100 / (0.92 + 1.27 * Math.log(rain + 1)) + Le * (0.36 * (temp + 2.4) + 0.2))
    : dmc_prev + 1.894 * (temp + 1.1) * (100 - rh) * Le * 1e-4

  // DC
  const dc = rain > 2.8
    ? dc_prev - 0.9 * rain + 3.937 * (0.36 * (temp + 2.4))
    : dc_prev + 0.36 * (temp + 2.4)

  // ISI
  const fw  = Math.exp(0.05039 * wind)
  const fm  = 147.2 * (101 - ffmc) / (59.5 + ffmc)
  const sf  = 19.115 * Math.exp(-0.1386 * fm) * (1 + Math.pow(fm, 5.31) / 4.93e7)
  const isi = fw * sf

  // BUI
  const bui = dmc <= 0.4 * dc
    ? 0.8 * dmc * dc / (dmc + 0.4 * dc)
    : dmc - (1 - 0.8 * dc / (dmc + 0.4 * dc)) * (0.92 + Math.pow(0.0114 * dmc, 1.7))

  // FWI
  const B  = bui <= 80 ? 0.1 * isi * (0.626 * Math.pow(bui, 0.809) + 2) : 0.1 * isi * (1000 / (25 + 108.64 * Math.exp(-0.023 * bui)))
  const fwi = B > 1 ? Math.exp(2.72 * Math.pow(0.434 * Math.log(B), 0.647)) : B

  return { ffmc: Math.round(ffmc * 10) / 10, dmc: Math.round(dmc * 10) / 10, dc: Math.round(dc * 10) / 10, isi: Math.round(isi * 10) / 10, bui: Math.round(bui * 10) / 10, fwi: Math.round(fwi * 10) / 10 }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,relative_humidity_2m_min,wind_speed_10m_max,precipitation_sum&forecast_days=7&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const times:  string[]  = raw.daily?.time ?? []
  const maxT:   number[]  = raw.daily?.temperature_2m_max ?? []
  const minRH:  number[]  = raw.daily?.relative_humidity_2m_min ?? []
  const wind:   number[]  = raw.daily?.wind_speed_10m_max ?? []
  const precip: number[]  = raw.daily?.precipitation_sum ?? []

  const days: FWIDay[] = []
  let ffmc = 85, dmc = 6, dc = 15

  times.slice(0, 7).forEach((t, i) => {
    const result = canadianFWI(maxT[i] ?? 25, minRH[i] ?? 30, wind[i] ?? 15, precip[i] ?? 0, ffmc, dmc, dc)
    ffmc = result.ffmc; dmc = result.dmc; dc = result.dc
    const { cat, label, color } = fwiCategory(result.fwi)
    days.push({
      label: new Date(t).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      fwi: result.fwi,
      category: cat,
      color,
      maxTemp: Math.round((maxT[i] ?? 25) * 10) / 10,
      minHumidity: Math.round(minRH[i] ?? 30),
      wind: Math.round(wind[i] ?? 15),
      precip: Math.round((precip[i] ?? 0) * 10) / 10,
    })
  })

  const today = days[0]
  const { cat, label, color } = fwiCategory(today.fwi)
  const adviceMap: Record<string, string> = {
    low: 'Sin restricciones especiales para actividades al aire libre',
    moderate: 'Precaución con fogatas — no dejar fuego sin supervisión',
    high: 'Evitar fogatas — viento y condiciones facilitan propagación',
    very_high: 'Prohibición de fogatas recomendada — riesgo alto de incendio',
    extreme: 'Alerta máxima — cualquier chispa puede provocar incendio forestal',
  }

  const curResult = canadianFWI(maxT[0] ?? 25, minRH[0] ?? 30, wind[0] ?? 15, precip[0] ?? 0)

  return NextResponse.json({
    fwi: today.fwi,
    fwiCategory: cat,
    fwiLabel: label,
    fwiColor: color,
    ffmc: curResult.ffmc,
    dmc: curResult.dmc,
    dc: curResult.dc,
    isi: curResult.isi,
    bui: curResult.bui,
    advice: adviceMap[cat],
    days,
  } satisfies FireWeatherIndexData)
}
