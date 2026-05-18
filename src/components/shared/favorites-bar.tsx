'use client'
import { Star, X, Share2, Check } from 'lucide-react'
import { useState } from 'react'
import { useLocationStore } from '@/stores/location-store'

export function FavoritesBar() {
  const { location, favorites, addFavorite, removeFavorite, isFavorite, setLocation } = useLocationStore()
  const [copied, setCopied] = useState(false)

  const starred = location ? isFavorite(location.lat, location.lon) : false

  function toggleFavorite() {
    if (!location) return
    if (starred) removeFavorite(location.lat, location.lon)
    else addFavorite(location)
  }

  async function share() {
    if (!location) return
    const text = `Ver clima de ${location.name} en MundoEquil`
    const url = `${window.location.origin}?lat=${location.lat}&lon=${location.lon}&name=${encodeURIComponent(location.name)}&country=${location.country}`
    try {
      if (navigator.share) {
        await navigator.share({ title: text, url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {}
  }

  if (!location && favorites.length === 0) return null

  return (
    <div className="border-b border-white/5 bg-slate-950/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-3 overflow-x-auto scrollbar-thin">

        {/* Current city actions */}
        {location && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleFavorite}
              title={starred ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-colors ${
                starred
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-amber-400'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${starred ? 'fill-amber-400' : ''}`} />
              {starred ? 'Guardado' : 'Guardar'}
            </button>

            <button
              onClick={share}
              title="Compartir"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-sky-400 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              {copied ? '¡Copiado!' : 'Compartir'}
            </button>
          </div>
        )}

        {/* Favorites list */}
        {favorites.length > 0 && (
          <>
            <div className="h-4 w-px bg-white/10 shrink-0" />
            <div className="flex items-center gap-2">
              {favorites.map((fav) => {
                const isActive = location
                  ? Math.abs(fav.lat - location.lat) < 0.01 && Math.abs(fav.lon - location.lon) < 0.01
                  : false
                return (
                  <div key={`${fav.lat}-${fav.lon}`} className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setLocation(fav)}
                      className={`text-xs px-3 py-1.5 rounded-xl transition-colors ${
                        isActive
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                      }`}
                    >
                      {fav.name}
                      {fav.country && <span className="text-slate-600 ml-1">{fav.country}</span>}
                    </button>
                    {!isActive && (
                      <button
                        onClick={() => removeFavorite(fav.lat, fav.lon)}
                        className="text-slate-700 hover:text-slate-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
