import type { CardPreferences } from '@/stores/preferences-store'

export type TimeScope = 'today' | 'week' | 'history'

export interface CardMeta {
  key: keyof CardPreferences
  label: string
  desc: string
  timeScope: TimeScope
}

export interface SubCategory {
  name: string
  cards: CardMeta[]
}

export interface Element {
  id: string
  name: string
  icon: string
  subcategories: SubCategory[]
}

export const ELEMENTS: Element[] = [
  // ──────────────────────────────────────────────────────────────
  // 🌬️  AIRE  — viento, atmósfera, calidad, nieve, aviación
  // ──────────────────────────────────────────────────────────────
  {
    id: 'aire', name: 'Aire', icon: '🌬️',
    subcategories: [
      {
        name: 'Viento',
        cards: [
          { key: 'showWindGust',        label: 'Viento y ráfagas',        desc: 'Rosa de vientos + gráfica 48h de velocidad y ráfagas',             timeScope: 'today'   },
          { key: 'showBeaufort',        label: 'Escala Beaufort',         desc: 'Fuerza del viento en escala Beaufort con descripción',              timeScope: 'today'   },
          { key: 'showWindProfile',     label: 'Perfil de viento',        desc: 'Viento por altitud: 10/80/120/180m — energía y aviación',           timeScope: 'today'   },
        ],
      },
      {
        name: 'Atmósfera',
        cards: [
          { key: 'showVisibility',      label: 'Visibilidad',             desc: 'Distancia visible, punto de rocío, riesgo de niebla',              timeScope: 'today'   },
          { key: 'showPressureTendency',label: 'Tendencia barométrica',   desc: 'Variación de presión en 3h, predictor de cambio de tiempo',         timeScope: 'today'   },
          { key: 'showAtmosphericOptics',label:'Óptica atmosférica',      desc: 'Condiciones para halos, arcoíris y fenómenos ópticos',              timeScope: 'today'   },
          { key: 'showThermalInversion',label: 'Inversión Térmica',       desc: 'Altura de inversión, índice de estabilidad, visibilidad',           timeScope: 'today'   },
          { key: 'showMicroclimate',    label: 'Isla Calor Urbano',       desc: 'Diferencia urbano-rural de temperatura y humedad',                  timeScope: 'today'   },
          { key: 'showWeatherPattern',  label: 'Situación Sinóptica',     desc: 'Patrón sinóptico actual: frentes, centros de presión',              timeScope: 'week'    },
        ],
      },
      {
        name: 'Calidad del Aire',
        cards: [
          { key: 'showAQIWHO',          label: 'AQI OMS',                 desc: 'Índice de calidad del aire según guías OMS',                       timeScope: 'today'   },
          { key: 'showAQIForecast',     label: 'Pronóstico AQI',          desc: 'Calidad del aire próximos 7 días',                                  timeScope: 'week'    },
          { key: 'showHealthIndex',     label: 'Índice de Salud',         desc: 'Índice combinado: AQI + UV + temperatura + humedad',                timeScope: 'today'   },
          { key: 'showIndoorAir',       label: 'Aire interior',           desc: 'Estimación de calidad del aire en interiores',                      timeScope: 'today'   },
          { key: 'showSmoke',           label: 'Humo',                    desc: 'Concentración de PM2.5 por incendios, alcance del humo',            timeScope: 'today'   },
        ],
      },
      {
        name: 'Nieve e Invierno',
        cards: [
          { key: 'showFog',             label: 'Niebla y visibilidad',    desc: 'P(niebla) por hora, ventanas de niebla 3 días',                     timeScope: 'today'   },
          { key: 'showIcing',           label: 'Engelamiento en vuelo',   desc: 'Capas de hielo, probabilidad horaria y tipo',                       timeScope: 'today'   },
          { key: 'showWinter',          label: 'Nieve e invierno',        desc: 'Acumulación de nieve, nivel de cero y riesgo de hielo 8 días',      timeScope: 'week'    },
          { key: 'showWinterSports',    label: 'Deportes de Invierno',    desc: 'Índice de ski, calidad de nieve, sensación 7 días',                 timeScope: 'week'    },
        ],
      },
      {
        name: 'Aviación',
        cards: [
          { key: 'showCloudCover',      label: 'Nubosidad por capas',     desc: 'Nubes altas, medias y bajas con mini-cielo animado',                timeScope: 'today'   },
          { key: 'showCloudCeiling',    label: 'Techo Nuboso',            desc: 'Base de nubes, categoría de vuelo, tendencia 24h',                  timeScope: 'today'   },
          { key: 'showFreezingLevel',   label: 'Nivel de Congelación',    desc: 'Isoterma 0°C actual y pronóstico, engelamiento en ruta',            timeScope: 'today'   },
          { key: 'showAviation',        label: 'Aviación',                desc: 'Techo de nubes, visibilidad, categoría IFR/VFR',                    timeScope: 'today'   },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // 💧  AGUA  — tormentas, lluvia, humedad, mar, peligros
  // ──────────────────────────────────────────────────────────────
  {
    id: 'agua', name: 'Agua', icon: '💧',
    subcategories: [
      {
        name: 'Tormentas',
        cards: [
          { key: 'showLightning',        label: 'Tormentas eléctricas',   desc: 'Potencial de rayos, CAPE, índice de lift',                          timeScope: 'today'   },
          { key: 'showLightningDensity', label: 'Densidad de Rayos',      desc: 'Mapa de impactos estimados, línea de riesgo 48h',                   timeScope: 'today'   },
          { key: 'showThunderstorm',     label: 'Actividad convectiva',   desc: 'CAPE, índice de levantamiento y P(tormenta) 48h',                   timeScope: 'today'   },
          { key: 'showThunderstormProb', label: 'P(Tormenta) Detallada',  desc: 'Probabilidad horaria de tormenta: CAPE, LI, K-Index 48h',           timeScope: 'today'   },
          { key: 'showAirMass',          label: 'Masa de Aire',           desc: 'Clasificación cA/cP/mT/mE, estabilidad y altura de mezcla',         timeScope: 'today'   },
          { key: 'showConvectiveOutlook',label: 'Perspectiva Convectiva', desc: 'CAPE, LI, KI y cizalladura — categoría SPC 5 días',                 timeScope: 'week'    },
          { key: 'showHail',             label: 'Riesgo de Granizo',      desc: 'Probabilidad de granizo, tamaño estimado 48h',                      timeScope: 'today'   },
          { key: 'showTornado',          label: 'Riesgo de Tornados',     desc: 'Índice EHI, parámetro significativo 3 días',                        timeScope: 'week'    },
        ],
      },
      {
        name: 'Peligros',
        cards: [
          { key: 'showFireWeather',      label: 'Riesgo de Incendio',     desc: 'Índice de peligro forestal basado en temperatura, humedad y viento', timeScope: 'today'  },
          { key: 'showFireWeatherIndex', label: 'FWI Canadiense',         desc: 'FFMC, DMC, DC, ISI, BUI — sistema canadiense de peligro forestal',  timeScope: 'today'   },
          { key: 'showHeatWave',         label: 'Ola de Calor',           desc: 'Racha de días ≥35°C, noches tropicales 14 días',                    timeScope: 'week'    },
          { key: 'showColdWave',         label: 'Ola de Frío',            desc: 'Alerta de frío, sensación térmica, helada y nieve 7 días',           timeScope: 'week'    },
          { key: 'showTropical',         label: 'Ciclones tropicales',    desc: 'Índice de ciclogenesis: TSM, CAPE, temporada',                       timeScope: 'week'    },
        ],
      },
      {
        name: 'Lluvia y Nieve',
        cards: [
          { key: 'showPrecipType',       label: 'Tipo de precipitación',  desc: 'Lluvia vs nieve en 72h, nieve acumulada y nivel de cero',           timeScope: 'today'   },
          { key: 'showPrecipTypeDetail', label: 'Precipitación detallada',desc: 'Llovizna/lluvia/aguanieve/nieve/granizo por hora — 7 días',         timeScope: 'week'    },
          { key: 'showPrecipAccum',      label: 'Lluvia acumulada',       desc: 'Acumulado 7 días vs normal climático, días húmedos',                timeScope: 'week'    },
          { key: 'showPWAT',             label: 'Agua precipitable',      desc: 'Agua precipitable total en la columna atmosférica',                 timeScope: 'today'   },
          { key: 'showNightFrost',       label: 'Heladas Nocturnas',      desc: 'Probabilidad de helada esta noche y próximas',                      timeScope: 'week'    },
        ],
      },
      {
        name: 'Humedad',
        cards: [
          { key: 'showAbsoluteHumidity', label: 'Humedad Absoluta',       desc: 'g/m³ actual, punto de rocío, mezcla específica',                    timeScope: 'today'   },
          { key: 'showDewComfort',       label: 'Confort Rocío',          desc: 'Punto de rocío actual vs confort humano',                           timeScope: 'today'   },
          { key: 'showEvapotranspiration',label:'Evapotranspiración',     desc: 'ET₀ Penman-Monteith, balance hídrico diario y 10 días',             timeScope: 'today'   },
          { key: 'showHumidityForecast', label: 'Humedad Detallada',      desc: 'Pronóstico de humedad relativa horaria 7 días',                     timeScope: 'week'    },
          { key: 'showMonsoon',          label: 'Temporada de Lluvias',   desc: 'Fase del monzón/lluvias, anomalía acumulada estacional',            timeScope: 'week'    },
          { key: 'showDrought',          label: 'Sequía',                 desc: 'Índice de sequía SPI, déficit acumulado de lluvia',                 timeScope: 'history' },
        ],
      },
      {
        name: 'Mar y Ríos',
        cards: [
          { key: 'showMarine',           label: 'Marino',                 desc: 'Altura de ola, dirección, temperatura del mar y viento costero',    timeScope: 'today'   },
          { key: 'showFlood',            label: 'Caudal ríos',            desc: 'Nivel de ríos, caudal y riesgo de inundación — USGS',               timeScope: 'week'    },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // 🌍  TIERRA  — suelo, plantas, agricultura, fauna
  // ──────────────────────────────────────────────────────────────
  {
    id: 'tierra', name: 'Tierra', icon: '🌍',
    subcategories: [
      {
        name: 'Suelo',
        cards: [
          { key: 'showSoil',             label: 'Humedad del suelo',      desc: 'Humedad volumétrica a 0-7 cm y 7-28 cm de profundidad',             timeScope: 'today'   },
          { key: 'showSoilTemperature',  label: 'Temperatura del suelo',  desc: 'Temperatura superficial y pronóstico a 7 días',                     timeScope: 'week'    },
          { key: 'showVegetation',       label: 'Vegetación / NDVI',      desc: 'Índice de vegetación NDVI, anomalía mensual',                       timeScope: 'history' },
        ],
      },
      {
        name: 'Plantas y Polen',
        cards: [
          { key: 'showPollen',           label: 'Polen actual',           desc: 'Concentración actual de gramíneas, árboles y malezas',              timeScope: 'today'   },
          { key: 'showPollenForecast',   label: 'Pronóstico de Polen',    desc: 'Riesgo de alergia al polen próximos 7 días',                        timeScope: 'week'    },
          { key: 'showPollenCalendar',   label: 'Calendario de Polen',    desc: 'Temporadas de polinización por tipo de planta',                     timeScope: 'week'    },
          { key: 'showPhenology',        label: 'Fenología',              desc: 'Fases fenológicas estacionales: floración, migración, cosecha',     timeScope: 'history' },
        ],
      },
      {
        name: 'Agricultura',
        cards: [
          { key: 'showAgro',             label: 'Agro',                   desc: 'Índice agrometeorológico hoy: temperatura suelo, lluvia, ET₀',      timeScope: 'today'   },
          { key: 'showGarden',           label: 'Jardín y Huerto',        desc: 'Índice de jardinería hoy, riego, riesgo fúngico y helada',          timeScope: 'today'   },
          { key: 'showCropGrowth',       label: 'GDD Detallado',          desc: 'Días a floración/madurez por tipo de cultivo',                      timeScope: 'week'    },
          { key: 'showGrowingDegreeDays',label: 'GDD Acumulado',          desc: 'Grados-día de crecimiento acumulados — desarrollo de cultivos',     timeScope: 'history' },
        ],
      },
      {
        name: 'Fauna',
        cards: [
          { key: 'showWildlifeActivity', label: 'Actividad de Fauna',     desc: 'Índice de actividad de fauna según condiciones meteorológicas',     timeScope: 'today'   },
          { key: 'showSolunar',          label: 'Tablas Solunares',       desc: 'Períodos solunares de mayor actividad de peces y fauna',            timeScope: 'today'   },
          { key: 'showFishing',          label: 'Pesca',                  desc: 'Condiciones para pesca: presión, temp agua, viento, solunar',       timeScope: 'today'   },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // ☀️  SOL Y CIELO  — sol, UV, luna, astronomía, energía
  // ──────────────────────────────────────────────────────────────
  {
    id: 'cielo', name: 'Sol y Cielo', icon: '☀️',
    subcategories: [
      {
        name: 'Sol',
        cards: [
          { key: 'showSolar',            label: 'Radiación solar',        desc: 'Irradiancia directa y difusa, índice UV actual',                    timeScope: 'today'   },
          { key: 'showSunCalendar',      label: 'Calendario Solar',       desc: 'Amanecer, ocaso, duración del día y crepúsculos',                  timeScope: 'today'   },
          { key: 'showGoldenHour',       label: 'Hora Dorada',            desc: 'Ventanas de luz dorada y azul para fotografía',                    timeScope: 'today'   },
          { key: 'showSolarPosition',    label: 'Posición Solar',         desc: 'Azimut y elevación solar a lo largo del día',                       timeScope: 'today'   },
          { key: 'showUVForecast',       label: 'UV Forecast',            desc: 'Índice UV horario próximos 7 días',                                 timeScope: 'week'    },
          { key: 'showUVSkin',           label: 'UV + Fototipos',         desc: 'Tiempo de quemadura por fototipo de piel, horas seguras',           timeScope: 'today'   },
          { key: 'showSunshineHours',    label: 'Horas de Sol',           desc: 'Horas de sol efectivas por día, próxima semana',                   timeScope: 'week'    },
          { key: 'showDaylightYear',     label: 'Año de luz',             desc: 'Gráfica anual de horas de luz — solsticios y equinoccios',         timeScope: 'history' },
        ],
      },
      {
        name: 'Luna y Noche',
        cards: [
          { key: 'showAPOD',             label: 'APOD',                   desc: 'Astronomic Picture of the Day — NASA',                              timeScope: 'today'   },
          { key: 'showCelestial',        label: 'Posición celeste',       desc: 'Posición actual de planetas, luna y objetos del cielo',             timeScope: 'today'   },
          { key: 'showMoonCalendar',     label: 'Calendario lunar',       desc: 'Fase lunar actual, horarios de salida y ocaso',                    timeScope: 'today'   },
          { key: 'showStargazing',       label: 'Stargazing',             desc: 'Índice de observación nocturna: seeing, turbulencia, transparencia',timeScope: 'today'   },
          { key: 'showSpaceWeather',     label: 'Clima espacial',         desc: 'Actividad solar, índice Kp, alertas de tormenta geomagnética',      timeScope: 'today'   },
          { key: 'showMoonAlmanac',      label: 'Almanaque Lunar',        desc: 'Fases lunares del mes, horarios y distancia',                      timeScope: 'week'    },
          { key: 'showMeteorShower',     label: 'Lluvia de Meteoros',     desc: 'Próximas lluvias de meteoros, ZHR y condiciones de observación',   timeScope: 'week'    },
        ],
      },
      {
        name: 'Energía Renovable',
        cards: [
          { key: 'showSolarYield',       label: 'Solar FV',               desc: 'Producción fotovoltaica estimada kWh/kWp — 10 días',               timeScope: 'week'    },
          { key: 'showWindEnergy',       label: 'Energía eólica',         desc: 'Potencia eólica estimada, horas productivas 7 días',               timeScope: 'week'    },
          { key: 'showEnergyDemand',     label: 'Demanda Energética',     desc: 'Consumo eléctrico estimado por HDD/CDD',                            timeScope: 'week'    },
          { key: 'showRenewable',        label: 'Energía renovable',      desc: 'Índice combinado solar + eólico para generación renovable',         timeScope: 'week'    },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // 🧭  GENERAL  — pronóstico, confort, actividades, historia
  // ──────────────────────────────────────────────────────────────
  {
    id: 'general', name: 'General', icon: '🧭',
    subcategories: [
      {
        name: 'Pronóstico',
        cards: [
          { key: 'showMap',              label: 'Mapa del tiempo',         desc: 'Mapa interactivo con capas meteorológicas',                        timeScope: 'week'    },
          { key: 'showHeatmap',          label: 'Mapa de calor 7 días',   desc: 'Rejilla hora×día con temperatura y lluvia',                        timeScope: 'week'    },
          { key: 'showExtendedForecast', label: 'Pronóstico 16 días',     desc: 'Vista compacta con barra de temperatura y precipitación',          timeScope: 'week'    },
          { key: 'showTomorrow',         label: 'Mañana detallado',       desc: 'Pronóstico completo de mañana: horario, amanecer, pico de calor',  timeScope: 'week'    },
          { key: 'showWeekend',          label: 'Fin de semana',          desc: 'Pronóstico detallado del sábado y domingo',                        timeScope: 'week'    },
          { key: 'showSpotForecast',     label: 'Pronóstico por horas',   desc: 'Tabla horaria detallada con 10 variables meteorológicas',           timeScope: 'today'   },
        ],
      },
      {
        name: 'Confort y Salud',
        cards: [
          { key: 'showUTCI',             label: 'UTCI',                   desc: 'Universal Thermal Climate Index — estrés térmico real',            timeScope: 'today'   },
          { key: 'showHeatIndex',        label: 'Índice de Calor',        desc: 'Temperatura aparente con efecto de humedad',                       timeScope: 'today'   },
          { key: 'showComfort',          label: 'Confort térmico',        desc: 'PMV/PPD, sensación real y recomendaciones',                        timeScope: 'today'   },
          { key: 'showBioclimate',       label: 'Confort bioclimático',   desc: 'Diagrama psicrométrico, zona de confort y estrés',                 timeScope: 'today'   },
          { key: 'showHeatSafety',       label: 'Seguridad térmica',      desc: 'Nivel de alerta por calor, hidratación y protección recomendada',  timeScope: 'today'   },
          { key: 'showSleep',            label: 'Sueño',                  desc: 'Condiciones para dormir: temp, humedad, índice de confort nocturno',timeScope: 'today'  },
          { key: 'showClothing',         label: 'Ropa',                   desc: 'Recomendación de vestimenta por temperatura y precipitación',      timeScope: 'today'   },
        ],
      },
      {
        name: 'Actividades',
        cards: [
          { key: 'showActivities',       label: 'Actividades ext.',       desc: 'Índice para correr, ciclismo y actividades al aire libre',          timeScope: 'today'   },
          { key: 'showBeach',            label: 'Playa',                  desc: 'Índice de playa: UV, viento, temperatura, oleaje',                 timeScope: 'today'   },
          { key: 'showTraining',         label: 'Entrenamiento',          desc: 'Condiciones para entrenamiento deportivo exterior',                 timeScope: 'today'   },
          { key: 'showDrivingSafety',    label: 'Manejo',                 desc: 'Seguridad vial: visibilidad, lluvia, viento y hielo',               timeScope: 'today'   },
          { key: 'showOutdoorActivities',label: 'Outdoor',               desc: 'Índice de actividades al aire libre: senderismo, camping',          timeScope: 'today'   },
          { key: 'showWaterActivity',    label: 'Acuáticas',              desc: 'Condiciones para natación, kayak y deportes acuáticos',            timeScope: 'today'   },
        ],
      },
      {
        name: 'Historia',
        cards: [
          { key: 'showHistory',          label: 'Historial 14d',          desc: 'Temperatura y precipitación real últimas 2 semanas',               timeScope: 'history' },
          { key: 'showMonthlyStats',     label: 'Stats mensuales',        desc: 'Resumen estadístico del mes: máximas, mínimas, lluvia',            timeScope: 'history' },
          { key: 'showRecords',          label: 'Récords',                desc: 'Récords históricos de temperatura y precipitación',                timeScope: 'history' },
          { key: 'showClimateAnomaly',   label: 'Anomalías',              desc: 'Anomalía de temperatura y lluvia vs normal climático',              timeScope: 'history' },
          { key: 'showClimateNormals',   label: 'Normales Climáticas',    desc: 'Promedios históricos mensuales 1991-2020',                         timeScope: 'history' },
          { key: 'showExtremeEvents',    label: 'Eventos Extremos',       desc: 'Historial de eventos extremos en la región',                       timeScope: 'history' },
        ],
      },
      {
        name: 'Global',
        cards: [
          { key: 'showCityComparison',   label: 'Comparación ciudades',   desc: 'Clima actual de tu ciudad vs otras ciudades del mundo',            timeScope: 'today'   },
          { key: 'showWorldClock',       label: 'Reloj mundial',          desc: 'Hora actual en 8 zonas horarias',                                  timeScope: 'today'   },
          { key: 'showClimateZone',      label: 'Zona Climática Köppen',  desc: 'Clasificación climática Köppen-Geiger de tu ubicación',            timeScope: 'history' },
          { key: 'showShare',            label: 'Compartir / Widget',     desc: 'Enlace compartible y código de integración',                       timeScope: 'today'   },
        ],
      },
    ],
  },
]

// ── Derived flat list (for preferences panel backwards compat) ──
export const CATEGORIES = ELEMENTS.flatMap(e =>
  e.subcategories.map(s => ({ name: s.name, icon: e.icon, element: e.name, cards: s.cards }))
)

// ── Lookup maps ──
export const ELEMENT_BY_KEY     = new Map<keyof CardPreferences, string>()
export const SUBCATEGORY_BY_KEY = new Map<keyof CardPreferences, string>()
export const TIME_SCOPE_BY_KEY  = new Map<keyof CardPreferences, TimeScope>()

for (const el of ELEMENTS) {
  for (const sub of el.subcategories) {
    for (const card of sub.cards) {
      ELEMENT_BY_KEY.set(card.key, el.id)
      SUBCATEGORY_BY_KEY.set(card.key, sub.name)
      TIME_SCOPE_BY_KEY.set(card.key, card.timeScope)
    }
  }
}
