# MundoEquil — Panel Ambiental en Tiempo Real

Plataforma web gratuita y open-source que centraliza información ambiental en tiempo real: clima, calidad del aire, astronomía, sismos, energía renovable y más.

**[mundoequil.vercel.app](https://mundoequil.vercel.app)** · Gratis · Sin registro · Open source

---

## Características

- **110+ tarjetas** de información ambiental organizadas en 5 elementos (Aire, Agua, Tierra, Sol y Cielo, General)
- **Tiempo real** — clima cada 60 s, AQI cada 5 min, sismos cada 2 min
- **100% APIs gratuitas** — sin coste, sin límites prácticos para uso personal
- **PWA instalable** — funciona como app nativa en móvil y escritorio
- **Dark mode** exclusivo, diseño glassmorphism
- **Mapa interactivo** con radar, satélite infrarrojo, viento y nubes
- Búsqueda por ciudad, geolocalización, favoritos y compartir por URL

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript strict |
| Estilos | Tailwind CSS + shadcn/ui |
| Animaciones | Framer Motion |
| Mapas | Leaflet.js + CARTO dark tiles |
| Estado | Zustand (persistido en localStorage) |
| Fetching | TanStack Query |
| Deploy | Vercel (free tier) |

## APIs utilizadas

| API | Datos | Key |
|-----|-------|-----|
| [Open-Meteo](https://open-meteo.com) | Clima, AQI, marino, agro | No requerida |
| [USGS](https://earthquake.usgs.gov) | Sismos | No requerida |
| [Nominatim](https://nominatim.org) | Geocodificación | No requerida |
| [RainViewer](https://www.rainviewer.com) | Radar e infrarrojo | No requerida |
| [NASA APOD](https://apod.nasa.gov) | Foto astronómica del día | Opcional (usa DEMO_KEY) |
| [OpenWeatherMap](https://openweathermap.org) | Tiles de mapa | Requerida (free tier) |

## Desarrollo local

```bash
# 1. Clonar
git clone https://github.com/thestrokes1/MundoEquil.git
cd MundoEquil

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus keys

# 4. Arrancar
npm run dev
# → http://localhost:3000
```

## Variables de entorno

```env
OPENWEATHERMAP_API_KEY=   # OpenWeatherMap — tiles del mapa (gratuito)
NASA_API_KEY=             # NASA APOD — opcional, usa DEMO_KEY si se omite
```

## Estructura del proyecto

```
src/
├── app/
│   ├── api/          # 88 rutas BFF (ocultan API keys, transforman datos)
│   ├── dashboard.tsx # Renderiza las 110 tarjetas
│   └── layout.tsx
├── components/
│   ├── air/          # Tarjetas de calidad del aire
│   ├── astronomy/    # Tarjetas astronómicas
│   ├── map/          # Mapa interactivo
│   ├── shared/       # Header, nav, preferencias
│   └── weather/      # Tarjetas de clima (mayoría)
├── lib/
│   └── card-categories.ts  # Fuente de verdad: jerarquía de navegación
└── stores/           # Zustand: ubicación, preferencias, nav
```

## Contribuir

Pull requests bienvenidos. Para cambios grandes, abre un issue primero.

Patrón estándar para nuevas tarjetas:
1. Ruta API en `src/app/api/<name>/route.ts`
2. Componente en `src/components/<cat>/<name>-card.tsx`
3. Toggle en `src/stores/preferences-store.ts`
4. Entrada en `src/lib/card-categories.ts`
5. Render en `src/app/dashboard.tsx`

## Licencia

MIT
