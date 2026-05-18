'use client'
import { MapPin, Globe2, Wind, Activity } from 'lucide-react'
import { useGeolocation } from '@/hooks/use-geolocation'
import { useLocationStore } from '@/stores/location-store'

export function WelcomeScreen() {
  const { detect, loading } = useGeolocation()
  const setLocation = useLocationStore((s) => s.setLocation)

  async function handleDetect() {
    const loc = await detect()
    if (loc) setLocation(loc)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 gap-8">
      <div className="space-y-3">
        <div className="text-6xl">🌍</div>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 tracking-tight">
          Panel Ambiental<br />en Tiempo Real
        </h1>
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          Clima, calidad del aire, astronomía y sismos — todo actualizado al instante, gratis y sin registro.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg">
        {[
          { icon: '🌤️', label: 'Clima en vivo' },
          { icon: '💨', label: 'Calidad del aire' },
          { icon: '🌙', label: 'Astronomía' },
          { icon: '🌋', label: 'Sismos USGS' },
        ].map((f) => (
          <div key={f.label} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-2xl">{f.icon}</span>
            <span className="text-xs text-slate-400">{f.label}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleDetect}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-semibold transition-colors disabled:opacity-60 text-sm"
      >
        <MapPin className="w-4 h-4" />
        {loading ? 'Detectando ubicación...' : 'Usar mi ubicación'}
      </button>

      <p className="text-xs text-slate-600">
        O busca una ciudad en la barra de búsqueda arriba
      </p>
    </div>
  )
}
