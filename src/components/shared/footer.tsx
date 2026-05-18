export function Footer() {
  const sources = [
    'Open-Meteo (clima, AQI, marino, inundaciones, agro)',
    'USGS (sismos)',
    'NASA APOD',
    'NOAA SWPC (clima espacial)',
    'OpenStreetMap / Nominatim (geocodificación)',
    'CartoDB (mapa base)',
  ]

  return (
    <footer className="border-t border-white/5 mt-8 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[10px] text-slate-600 mb-2">
          <span className="text-slate-500 font-medium">Fuentes de datos:</span>
          {sources.map((s, i) => (
            <span key={i}>{s}</span>
          ))}
        </div>
        <p className="text-center text-[10px] text-slate-700">
          Todos los datos son gratuitos y públicos · Actualización automática en tiempo real · MundoEquil
        </p>
      </div>
    </footer>
  )
}
