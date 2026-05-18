'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'

type LayerType = 'radar' | 'infrared' | 'wind' | 'clouds' | 'none'

interface RainViewerData {
  generated: number
  host: string
  radar?: { past?: { time: number; path: string }[] }
  satellite?: { infrared?: { time: number; path: string }[] }
}

const LAYER_LABELS: Record<LayerType, string> = {
  radar:    'Radar',
  infrared: 'Satélite',
  wind:     'Viento',
  clouds:   'Nubes',
  none:     'Base',
}

export function WeatherMap() {
  const location = useLocationStore(s => s.location)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const overlayRef = useRef<import('leaflet').TileLayer | null>(null)
  const [activeLayer, setActiveLayer] = useState<LayerType>('radar')
  const [mounted, setMounted] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [rvData, setRvData] = useState<RainViewerData | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(r => r.json())
      .then(setRvData)
      .catch(() => null)
  }, [])

  const getOverlayUrl = useCallback((): string | null => {
    if (activeLayer === 'radar' && rvData?.radar?.past?.length) {
      const latest = rvData.radar.past[rvData.radar.past.length - 1]
      return `${rvData.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`
    }
    if (activeLayer === 'infrared' && rvData?.satellite?.infrared?.length) {
      const latest = rvData.satellite.infrared[rvData.satellite.infrared.length - 1]
      return `${rvData.host}${latest.path}/256/{z}/{x}/{y}/0/0_0.png`
    }
    if (activeLayer === 'wind') return '/api/owm-tile/wind_new/{z}/{x}/{y}'
    if (activeLayer === 'clouds') return '/api/owm-tile/clouds_new/{z}/{x}/{y}'
    return null
  }, [activeLayer, rvData])

  // Initialize map — sets mapReady when done so the overlay effect can safely run
  useEffect(() => {
    if (!mounted || !containerRef.current || !location) return

    const initMap = async () => {
      const L = (await import('leaflet')).default
      if (!containerRef.current) return

      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (mapRef.current) {
        mapRef.current.setView([location.lat, location.lon], 7)
        return
      }

      const map = L.map(containerRef.current, {
        center: [location.lat, location.lon],
        zoom: 7,
        zoomControl: true,
        attributionControl: true,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      L.circleMarker([location.lat, location.lon], {
        radius: 8, fillColor: '#38bdf8', color: '#fff',
        weight: 2, opacity: 1, fillOpacity: 0.9,
      }).addTo(map).bindPopup(`<b>${location.name}</b><br>${location.country}`)

      mapRef.current = map
      setMapReady(true)
    }

    initMap()
  }, [mounted, location])

  // Update overlay — only runs after mapReady is true, avoiding the race condition
  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    const updateOverlay = async () => {
      const L = (await import('leaflet')).default
      if (!mapRef.current) return

      if (overlayRef.current) {
        mapRef.current.removeLayer(overlayRef.current)
        overlayRef.current = null
      }

      const url = getOverlayUrl()
      if (!url) return

      const overlay = L.tileLayer(url, {
        opacity: 0.7,
        maxZoom: 19,
        attribution: activeLayer === 'wind' || activeLayer === 'clouds'
          ? '&copy; OpenWeatherMap'
          : '&copy; RainViewer',
      })
      overlay.addTo(mapRef.current)
      overlayRef.current = overlay
    }

    updateOverlay()
  }, [activeLayer, rvData, mapReady, getOverlayUrl])

  if (!location) return null

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
      <div className="flex items-center gap-2 p-4 pb-0">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex-1">
          🗺 Mapa del tiempo
        </h3>
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(LAYER_LABELS) as LayerType[]).map(l => (
            <button
              key={l}
              onClick={() => setActiveLayer(l)}
              className={`text-xs px-2.5 py-1 rounded-xl transition-colors font-medium ${
                activeLayer === l
                  ? 'bg-sky-500/30 text-sky-300 border border-sky-500/40'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent'
              }`}
            >
              {LAYER_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      {!mounted ? (
        <Skeleton className="h-80 m-4 rounded-2xl bg-white/10" />
      ) : (
        <>
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <div ref={containerRef} className="h-80 m-4 rounded-2xl overflow-hidden" style={{ zIndex: 0 }} />
        </>
      )}

      <div className="px-4 pb-3 text-[10px] text-slate-600 text-center">
        Radar/Satélite: RainViewer · Viento/Nubes: OpenWeatherMap · Mapa: CARTO
        {rvData?.generated && (
          <> · {new Date(rvData.generated * 1000).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</>
        )}
      </div>
    </div>
  )
}
