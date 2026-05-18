# MundoEquil — Panel Ambiental Inteligente

Plataforma web gratuita y open-source que centraliza información ambiental en tiempo real: clima, calidad del aire, astronomía, alertas y más.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Animaciones | Framer Motion |
| Mapas | Leaflet.js + CARTO dark tiles |
| Estado global | Zustand |
| Fetching | TanStack Query — polling en vivo |
| Deploy | Vercel (free tier) |
| Backend/BFF | Next.js API Routes (oculta API keys) |

## Estado actual del proyecto (mayo 2026)

| Métrica | Valor |
|---------|-------|
| Rutas API (`/src/app/api/`) | **88** |
| Componentes tarjeta (`*-card.tsx`) | **113** |
| Toggles de preferencias | **110** |
| TypeScript errors | **0** |

## Tiempo Real

| Módulo | Intervalo |
|--------|-----------|
| Clima actual | 60 segundos |
| Calidad del aire | 5 minutos |
| Pronóstico | 15 minutos |
| Sismos | 2 minutos |
| Alertas | 30 segundos |

## APIs Gratuitas

- **Open-Meteo** — clima + AQI (sin key, ilimitado) · forecast + archive + marine
- **OpenWeatherMap** — 1,000 calls/día (también usado para tiles del mapa)
- **WeatherAPI** — 1,000,000 calls/mes
- **USGS** — sismos (sin key, ilimitado)
- **NASA APOD** — foto astronómica (NASA_API_KEY en .env, usa DEMO_KEY si no)
- **Nominatim** — geocodificación inversa (sin key)
- **RainViewer** — radar e infrarrojo satelital para el mapa (sin key, ilimitado)

## Variables de Entorno

Ver `.env.example` para la lista completa.

## Comandos

```bash
npm run dev        # http://localhost:3000
npm run build
npm run lint
npx tsc --noEmit   # verificar tipos antes de commit
```

## Convenciones de código

- Cada tarjeta sigue el patrón: API route en `/src/app/api/<name>/route.ts` + componente en `/src/components/<cat>/<name>-card.tsx`
- Todo componente exporta una interfaz `XxxData` desde la route para tipado compartido
- Guard estándar en componentes: `if (!data || 'error' in data || !data.days?.length) return null`
- Fetching: `useQuery` con `staleTime`, `refetchInterval: false`, `retry: false`
- Recharts: `formatter: (v: unknown, n: unknown) => [string, string]` para evitar TS errors
- Marine API: envolver fetch en `.catch(() => null)` — lanza excepción en coordenadas inland
- Open-Meteo `past_days`: máximo 92 en forecast API; usar archive-api para datos más antiguos
- `daily=soil_temperature_0cm_max/min` NO existe en Open-Meteo — usar `temperature_2m_max/min` como proxy
- El mapa no tiene modo claro — la app es dark-only (`class="dark"` fijo en `layout.tsx`)

## Arquitectura de navegación (mayo 2026)

La navegación del dashboard tiene 3 niveles jerárquicos:

```
Tiempo (Hoy / Esta semana / Histórico)
  └── Elemento (Aire / Agua / Tierra / Sol y Cielo / General)
        └── Subcategoría (Viento / Atmósfera / Calidad del Aire / …)
```

### Archivos clave

| Archivo | Rol |
|---------|-----|
| `src/lib/card-categories.ts` | Fuente de verdad: define `ELEMENTS`, subcategorías, `timeScope` de cada tarjeta |
| `src/stores/nav-store.ts` | Estado de navegación: `timeView`, `activeElement`, `activeSubcategory`, `settingsSubcategory` |
| `src/components/shared/dashboard-nav.tsx` | Nav sticky de 3 filas con drag-to-scroll y settings popover por subcategoría |
| `src/app/dashboard.tsx` | Renderiza tarjetas usando `vis()` + `pair()` |

### Lógica de visibilidad en `dashboard.tsx`

```ts
// visibleKeys: Set de claves que pasan el filtro de tiempo + elemento + subcategoría
const visibleKeys = useMemo(() => { ... }, [timeView, activeElement, activeSubcategory])

// vis(key): la tarjeta está habilitada en preferencias Y visible en el filtro actual
function vis(key: keyof CardPreferences): boolean {
  return visibleKeys.has(key) && cards[key]
}

// pair(a, b): renderiza 2 tarjetas lado a lado; si solo una es visible, ocupa todo el ancho
function pair(a: ReactNode, b: ReactNode): ReactNode {
  if (a && b) return <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{a}{b}</div>
  return a || b || null
}
```

`showCore()` controla las filas base (clima actual, AQI, pronóstico horario…) — solo visibles en "Hoy" sin filtro de elemento o con "General → Pronóstico".
`showMeta()` controla AlertBanner + TodaySummary — solo en "Hoy" sin elemento activo.

## Estructura de elementos y subcategorías

Definida en `src/lib/card-categories.ts`. Cada tarjeta tiene `key`, `label`, `desc` y `timeScope: 'today' | 'week' | 'history'`.

### 🌬️ Aire
- **Viento**: Viento/ráfagas, Beaufort, Perfil de viento
- **Atmósfera**: Visibilidad, Tendencia barométrica, Óptica atmosférica, Inversión térmica, Isla Calor Urbano, Situación sinóptica
- **Calidad del Aire**: AQI OMS, Pronóstico AQI, Índice de Salud, Aire interior, Humo
- **Nieve e Invierno**: Niebla, Engelamiento, Nieve e invierno, Deportes de invierno
- **Aviación**: Nubosidad por capas, Techo nuboso, Nivel de congelación, Aviación

### 💧 Agua
- **Tormentas**: Tormentas eléctricas, Densidad de rayos, Actividad convectiva, P(Tormenta) detallada, Masa de aire, Perspectiva convectiva, Granizo, Tornados
- **Peligros**: Incendio, FWI Canadiense, Ola de calor, Ola de frío, Ciclones tropicales
- **Lluvia y Nieve**: Tipo precipitación, Precipitación detallada, Lluvia acumulada, Agua precipitable, Heladas nocturnas
- **Humedad**: Humedad absoluta, Confort rocío, Evapotranspiración, Humedad detallada, Temporada lluvias, Sequía
- **Mar y Ríos**: Marino, Caudal ríos

### 🌍 Tierra
- **Suelo**: Humedad del suelo, Temperatura del suelo, Vegetación/NDVI
- **Plantas y Polen**: Polen actual, Pronóstico polen, Calendario polen, Fenología
- **Agricultura**: Agro, Jardín y huerto, GDD Detallado, GDD Acumulado
- **Fauna**: Actividad fauna, Tablas solunares, Pesca

### ☀️ Sol y Cielo
- **Sol**: Radiación solar, Calendario solar, Hora dorada, Posición solar, UV Forecast, UV+Fototipos, Horas de sol, Año de luz
- **Luna y Noche**: APOD, Posición celeste, Calendario lunar, Stargazing, Clima espacial, Almanaque lunar, Lluvia de meteoros
- **Energía Renovable**: Solar FV, Energía eólica, Demanda energética, Energía renovable

### 🧭 General
- **Pronóstico**: Mapa del tiempo, Mapa de calor 7d, Pronóstico 16d, Mañana detallado, Fin de semana, Pronóstico por horas
- **Confort y Salud**: UTCI, Índice de calor, Confort térmico, Confort bioclimático, Seguridad térmica, Sueño, Ropa
- **Actividades**: Actividades ext., Playa, Entrenamiento, Manejo, Outdoor, Acuáticas
- **Historia**: Historial 14d, Stats mensuales, Récords, Anomalías, Normales climáticas, Eventos extremos
- **Global**: Comparación ciudades, Reloj mundial, Zona Köppen, Compartir

## Mapa del tiempo (`WeatherMap`)

- Componente: `src/components/map/weather-map.tsx`
- Toma ubicación directo del store (`useLocationStore`) — no necesita props
- Capas: Radar (RainViewer), Satélite infrarrojo (RainViewer), Viento (OWM vía proxy), Nubes (OWM vía proxy)
- Proxy de tiles OWM: `src/app/api/owm-tile/[...path]/route.ts` — oculta la API key server-side
- **Race condition corregida**: usa estado `mapReady` (no ref) para sincronizar inicialización del mapa con el efecto de overlays

## Preferencias / tarjetas

Todas las tarjetas se controlan con booleanos en `src/stores/preferences-store.ts`.
Panel UI: `src/components/shared/preferences-panel.tsx` — usa `CATEGORIES` derivado de `ELEMENTS`.
Dashboard: `src/app/dashboard.tsx`.
