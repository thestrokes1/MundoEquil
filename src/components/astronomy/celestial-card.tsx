'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { getMoonPhaseLabel } from '@/lib/weather-codes'
import type { CelestialData } from '@/app/api/celestial/route'

function compassFromAzimuth(az: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO']
  return dirs[Math.round(az / 22.5) % 16]
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function AltitudeDial({ elevation, azimuth, color, emoji }: { elevation: number; azimuth: number; color: string; emoji: string }) {
  const SIZE = 80
  const CX = SIZE / 2
  const CY = SIZE / 2
  const R = 32

  // Convert azimuth (0=N, 90=E, 180=S, 270=W) and elevation to x/y on circle
  // Elevation 0=horizon, 90=zenith; map to distance from center (0 at edge, 0 at center)
  const elev = Math.max(-90, Math.min(90, elevation))
  const dist = elev >= 0 ? R * (1 - elev / 90) : R * (1 + (-elev) / 90 * 0.3)
  const angleRad = ((azimuth - 90 + 360) % 360) * Math.PI / 180
  const px = CX + dist * Math.cos(angleRad)
  const py = CY + dist * Math.sin(angleRad)

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {/* Rings */}
      {[R, R * 0.67, R * 0.33].map((r, i) => (
        <circle key={i} cx={CX} cy={CY} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      ))}
      {/* Cardinal points */}
      {[
        { label: 'N', x: CX, y: CY - R - 6 },
        { label: 'E', x: CX + R + 6, y: CY + 3 },
        { label: 'S', x: CX, y: CY + R + 9 },
        { label: 'O', x: CX - R - 8, y: CY + 3 },
      ].map(p => (
        <text key={p.label} x={p.x} y={p.y} textAnchor="middle" fill="rgba(148,163,184,0.6)" fontSize={8} fontFamily="system-ui">{p.label}</text>
      ))}
      {/* Crosshairs */}
      <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
      <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
      {/* Object position */}
      {elev >= -5 && (
        <>
          <circle cx={px} cy={py} r={9} fill={color} fillOpacity={0.3} />
          <text x={px} y={py + 4} textAnchor="middle" fontSize={11} fontFamily="system-ui">{emoji}</text>
        </>
      )}
      {/* Zenith dot */}
      <circle cx={CX} cy={CY} r={2} fill="rgba(255,255,255,0.2)" />
    </svg>
  )
}

export function CelestialCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<CelestialData>({
    queryKey: ['celestial', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/celestial?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 300_000,
    refetchInterval: 300_000,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-44 bg-white/10" />
        <Skeleton className="h-40 bg-white/10" />
      </div>
    )
  }

  if (!data || !data.sun || !data.moon) return null

  const { sun, moon } = data
  const { label: moonPhaseLabel, emoji: moonEmoji } = getMoonPhaseLabel(moon.phase)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Posición Celeste</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Sun */}
        <div className="text-center">
          <div className="text-xs text-slate-500 mb-2 font-medium">☀ Sol</div>
          <div className="flex justify-center mb-2">
            <AltitudeDial elevation={sun.elevation} azimuth={sun.azimuth} color="#fbbf24" emoji="☀" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Elevación</span>
              <span className={`font-semibold ${sun.isUp ? 'text-amber-300' : 'text-slate-500'}`}>{sun.elevation}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Azimut</span>
              <span className="text-slate-300 font-semibold">{sun.azimuth}° ({compassFromAzimuth(sun.azimuth)})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Estado</span>
              <span className={`font-semibold ${sun.isUp ? 'text-amber-300' : 'text-indigo-400'}`}>{sun.isUp ? 'Sobre horizonte' : 'Bajo horizonte'}</span>
            </div>
            {sun.dawnStart && (
              <div className="flex justify-between">
                <span className="text-slate-500">Aurora civil</span>
                <span className="text-slate-300">{formatTime(sun.dawnStart)}</span>
              </div>
            )}
            {sun.duskEnd && (
              <div className="flex justify-between">
                <span className="text-slate-500">Ocaso civil</span>
                <span className="text-slate-300">{formatTime(sun.duskEnd)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Moon */}
        <div className="text-center">
          <div className="text-xs text-slate-500 mb-2 font-medium">{moonEmoji} Luna</div>
          <div className="flex justify-center mb-2">
            <AltitudeDial elevation={moon.elevation} azimuth={moon.azimuth} color="#818cf8" emoji={moonEmoji} />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Elevación</span>
              <span className={`font-semibold ${moon.isUp ? 'text-indigo-300' : 'text-slate-500'}`}>{moon.elevation}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Azimut</span>
              <span className="text-slate-300 font-semibold">{moon.azimuth}° ({compassFromAzimuth(moon.azimuth)})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Iluminación</span>
              <span className="text-indigo-300 font-semibold">{moon.illumination}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Fase</span>
              <span className="text-slate-300 font-semibold">{moonPhaseLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
