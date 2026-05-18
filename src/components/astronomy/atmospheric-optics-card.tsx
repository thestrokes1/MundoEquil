'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { WeatherData } from '@/types/weather'

const DEG = Math.PI / 180

// Solar declination (Spencer 1971)
function solarDeclination(doy: number): number {
  const B = (360 / 365) * (doy - 81) * DEG
  return 23.45 * Math.sin(B)
}

// Day of year
function dayOfYear(d: Date): number {
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000)
}

// Solar elevation angle
function solarElevation(lat: number, decl: number, hourAngle: number): number {
  return Math.asin(
    Math.sin(lat * DEG) * Math.sin(decl * DEG) +
    Math.cos(lat * DEG) * Math.cos(decl * DEG) * Math.cos(hourAngle * DEG)
  ) / DEG
}

// Air mass (Kasten & Young 1989)
function airMass(elevDeg: number): number {
  if (elevDeg <= 0) return 38
  const z = 90 - elevDeg
  return 1 / (Math.cos(z * DEG) + 0.50572 * Math.pow(90.833 - z, -1.6364))
}

// Rayleigh scattering color description
function skyColor(am: number, cloudiness: number): { label: string; bg: string; horizon: string } {
  if (cloudiness > 80) return { label: 'Cielo nublado gris', bg: '#94a3b8', horizon: '#64748b' }
  if (am < 1.5)        return { label: 'Azul intenso cenital', bg: '#1e40af', horizon: '#7dd3fc' }
  if (am < 3)          return { label: 'Azul cielo', bg: '#2563eb', horizon: '#93c5fd' }
  if (am < 5)          return { label: 'Azul claro', bg: '#3b82f6', horizon: '#bfdbfe' }
  if (am < 8)          return { label: 'Amarillo–naranja', bg: '#d97706', horizon: '#fde68a' }
  if (am < 12)         return { label: 'Naranja–rojo', bg: '#b45309', horizon: '#fca5a5' }
  return                      { label: 'Rojo profundo', bg: '#991b1b', horizon: '#fca5a5' }
}

// Refraction correction at horizon (Bennet formula)
function refractionCorrection(elevDeg: number): number {
  // arcminutes, convert to degrees
  if (elevDeg > 15) return 0
  const r = 1.02 / Math.tan((elevDeg + 10.3 / (elevDeg + 5.11)) * DEG) / 60
  return r
}

// Atmospheric extinction (magnitudes lost per air mass)
function atmosphericExtinction(am: number, cloudiness: number): string {
  const ext = am * (0.25 + cloudiness * 0.004)  // 0.25 mag/AM clear sky
  if (ext < 0.5) return 'Excelente transparencia'
  if (ext < 1.0) return 'Buena transparencia'
  if (ext < 2.0) return 'Transparencia moderada'
  if (ext < 3.0) return 'Extinción significativa'
  return 'Cielo opaco'
}

export function AtmosphericOpticsCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])

  if (!location || !weather) return null

  const now = new Date()
  const doy = dayOfYear(now)
  const decl = solarDeclination(doy)
  const hourAngle = (now.getHours() + now.getMinutes() / 60 - 12) * 15

  const elevation = solarElevation(location.lat, decl, hourAngle)
  const am = airMass(elevation)
  const clouds = weather.current.cloudiness
  const refraction = refractionCorrection(elevation)
  const sky = skyColor(am, clouds)
  const transparency = atmosphericExtinction(am, clouds)

  // 24h elevation profile
  const elevProfile = Array.from({ length: 24 }, (_, h) => {
    const ha = (h - 12) * 15
    const el = solarElevation(location.lat, decl, ha)
    return { h: `${String(h).padStart(2, '0')}h`, el: parseFloat(el.toFixed(1)), am: parseFloat(airMass(el).toFixed(1)) }
  })

  // Twilight phases
  const twilights = [
    { name: 'Civil', angle: -6, desc: 'Horizonte aún visible' },
    { name: 'Náutico', angle: -12, desc: 'Estrellas brillantes visibles' },
    { name: 'Astronómico', angle: -18, desc: 'Cielo totalmente oscuro' },
  ]

  const locLat = location.lat  // capture for nested function
  // Find when each twilight phase begins/ends today
  function hoursAtElevation(targetEl: number): number[] {
    const crossings: number[] = []
    for (let h = 0; h < 24; h++) {
      const el1 = solarElevation(locLat, decl, (h - 12) * 15)
      const el2 = solarElevation(locLat, decl, (h + 1 - 12) * 15)
      if ((el1 <= targetEl && el2 > targetEl) || (el1 >= targetEl && el2 < targetEl)) {
        // Linear interpolation
        const frac = (targetEl - el1) / (el2 - el1)
        crossings.push(parseFloat((h + frac).toFixed(2)))
      }
    }
    return crossings
  }

  function hToHHMM(h: number): string {
    const hh = Math.floor(h)
    const mm = Math.round((h - hh) * 60)
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }

  const twilightTimes = twilights.map(t => {
    const crossings = hoursAtElevation(t.angle)
    return { ...t, times: crossings.map(hToHHMM) }
  })

  const maxEl = Math.max(...elevProfile.map(p => p.el))
  const sunriseHour = elevProfile.find(p => p.el > 0)?.h ?? '—'

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">🌈 Óptica Atmosférica</h3>

      {/* Sky color visualization */}
      <div className="mb-4 h-20 rounded-2xl overflow-hidden relative" style={{
        background: `linear-gradient(to bottom, ${sky.bg}, ${sky.horizon})`
      }}>
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-900/60 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xs font-medium text-white drop-shadow">{sky.label}</div>
            {elevation > 0 && (
              <div className="text-[10px] text-white/80 mt-0.5">Masa de aire: {am.toFixed(1)} AM</div>
            )}
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Elevación solar</div>
          <div className="font-bold text-xl text-slate-200">
            {elevation.toFixed(1)}°
          </div>
          <div className="text-[9px] text-slate-600 mt-0.5">{elevation < 0 ? 'Bajo el horizonte' : 'Sobre el horizonte'}</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Masa de aire</div>
          <div className="font-bold text-xl text-slate-200">{am > 30 ? '∞' : am.toFixed(1)}</div>
          <div className="text-[9px] text-slate-600 mt-0.5">AM (Kasten-Young)</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Declinación solar</div>
          <div className="font-bold text-xl text-slate-200">{decl.toFixed(1)}°</div>
          <div className="text-[9px] text-slate-600 mt-0.5">DOY {doy}</div>
        </div>
      </div>

      {/* Transparency */}
      <div className="mb-3 bg-white/5 rounded-xl px-3 py-2 text-xs flex items-center justify-between">
        <span className="text-slate-400">Transparencia atmosférica</span>
        <span className="text-slate-300 font-medium">{transparency}</span>
      </div>

      {/* Refraction */}
      {Math.abs(elevation) < 5 && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-violet-500/20 bg-violet-500/10 text-violet-300">
          🔭 Refracción atmosférica actual: +{(refraction * 60).toFixed(1)}' (el sol visible {(refraction * 60).toFixed(0)} minutos después de ponerse geométricamente)
        </div>
      )}

      {/* 24h elevation arc */}
      <div className="text-[10px] text-slate-600 mb-1">Elevación solar hoy (°) — máx. {maxEl.toFixed(1)}°</div>
      <div className="flex items-end gap-0 h-12">
        {elevProfile.map((p, i) => {
          const h = Math.max(0, p.el)
          const isNow = i === now.getHours()
          const pct = (h / Math.max(maxEl, 1)) * 100
          return (
            <div key={i} className="flex-1" title={`${p.h}: ${p.el}°`}>
              <div className="w-full rounded-t-sm" style={{
                height: `${Math.max(1, pct * 0.44)}px`,
                background: isNow ? '#fbbf24'
                  : p.el > 45 ? '#fbbf24'
                  : p.el > 20 ? '#fb923c'
                  : p.el > 0 ? '#f97316'
                  : '#1e293b',
                opacity: p.el <= 0 ? 0.2 : 0.85,
              }} />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[8px] text-slate-700 mt-0.5">
        <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
      </div>

      {/* Twilight table */}
      <div className="mt-4 space-y-1">
        <div className="text-[10px] text-slate-600 mb-2">Fases del crepúsculo</div>
        {twilightTimes.map((t, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-xl text-xs">
            <div className="flex-1">
              <span className="font-medium text-slate-300">Crepúsculo {t.name}</span>
              <span className="text-slate-600 ml-2 text-[10px]">(sol a {t.angle}°)</span>
            </div>
            <span className="text-slate-400 text-[10px]">{t.times.join(' / ')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
