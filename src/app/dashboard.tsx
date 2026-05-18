'use client'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useLocationStore } from '@/stores/location-store'
import { useWeather, useAirQuality, useWeatherHistory } from '@/hooks/use-weather'
import { WelcomeScreen } from '@/components/shared/welcome-screen'
import { CurrentWeatherCard, CurrentWeatherSkeleton } from '@/components/weather/current-weather'
import { HourlyForecastCard, HourlyForecastSkeleton } from '@/components/weather/hourly-forecast'
import { DailyForecastCard, DailyForecastSkeleton } from '@/components/weather/daily-forecast'
import { TemperatureChart } from '@/components/weather/temperature-chart'
import { PrecipitationChart } from '@/components/weather/precipitation-chart'
import { WindCompass } from '@/components/weather/wind-compass'
import { UVCard } from '@/components/weather/uv-card'
import { AQICard, AQISkeleton } from '@/components/air/aqi-card'
import { AstronomyCard, AstronomySkeleton } from '@/components/astronomy/astronomy-card'
import { EarthquakeCard } from '@/components/earthquakes/earthquake-card'
import { RecommendationsCard } from '@/components/weather/recommendations-card'
import { HumidityCard } from '@/components/weather/humidity-card'
import { PressureTrendCard, PressureTrendSkeleton } from '@/components/weather/pressure-trend-card'
import { AlertBanner } from '@/components/shared/alert-banner'
import { HistoryChart, HistoryChartSkeleton } from '@/components/weather/history-chart'
import { APODCard } from '@/components/astronomy/apod-card'
import { TodaySummary } from '@/components/weather/today-summary'
import { ComparisonCard } from '@/components/weather/comparison-card'
import { MonthlyStatsCard } from '@/components/weather/monthly-stats-card'
import { MarineCard } from '@/components/marine/marine-card'
import { SolarCard } from '@/components/weather/solar-card'
import { PollenCard } from '@/components/air/pollen-card'
import { FloodCard } from '@/components/weather/flood-card'
import { LightningCard } from '@/components/weather/lightning-card'
import { WeatherMap } from '@/components/map/weather-map'
import { SharePanel } from '@/components/shared/share-panel'
import { AgroCard } from '@/components/weather/agro-card'
import { AQIForecastCard } from '@/components/air/aqi-forecast-card'
import { WorldClock } from '@/components/shared/world-clock'
import { SpaceWeatherCard } from '@/components/astronomy/space-weather-card'
import { ClothingCard } from '@/components/weather/clothing-card'
import { VisibilityCard } from '@/components/weather/visibility-card'
import { WeatherHeatmap } from '@/components/weather/weather-heatmap'
import { CelestialCard } from '@/components/astronomy/celestial-card'
import { WindGustCard } from '@/components/weather/wind-gust-card'
import { ExtendedForecastCard } from '@/components/weather/extended-forecast-card'
import { FireWeatherCard } from '@/components/weather/fire-weather-card'
import { ComfortCard } from '@/components/weather/comfort-card'
import { RenewableCard } from '@/components/weather/renewable-card'
import { CloudCoverCard } from '@/components/weather/cloud-cover-card'
import { PrecipTypeCard } from '@/components/weather/precip-type-card'
import { ActivitiesCard } from '@/components/weather/activities-card'
import { SunCalendarCard } from '@/components/astronomy/sun-calendar-card'
import { UVForecastCard } from '@/components/weather/uv-forecast-card'
import { PollenForecastCard } from '@/components/air/pollen-forecast-card'
import { AQIWHOCard } from '@/components/air/aqi-who-card'
import { HealthIndexCard } from '@/components/shared/health-index-card'
import { MoonCalendarCard } from '@/components/astronomy/moon-calendar-card'
import { DaylightYearCard } from '@/components/astronomy/daylight-year-card'
import { StargazingCard } from '@/components/astronomy/stargazing-card'
import { DrivingSafetyCard } from '@/components/weather/driving-safety-card'
import { WeekendCard } from '@/components/weather/weekend-card'
import { TomorrowCard } from '@/components/weather/tomorrow-card'
import { PrecipAccumulationCard } from '@/components/weather/precip-accumulation-card'
import { GoldenHourCard } from '@/components/astronomy/golden-hour-card'
import { RecordsCard } from '@/components/weather/records-card'
import { HeatSafetyCard } from '@/components/weather/heat-safety-card'
import { SoilCard } from '@/components/weather/soil-card'
import { ThunderstormCard } from '@/components/weather/thunderstorm-card'
import { WinterCard } from '@/components/weather/winter-card'
import { FogCard } from '@/components/weather/fog-card'
import { BioclimateCard } from '@/components/weather/bioclimate-card'
import { SmokeCard } from '@/components/air/smoke-card'
import { BeachCard } from '@/components/weather/beach-card'
import { TrainingCard } from '@/components/weather/training-card'
import { ClimateAnomalyCard } from '@/components/weather/climate-anomaly-card'
import { MoonAlmanacCard } from '@/components/astronomy/moon-almanac-card'
import { MeteorShowerCard } from '@/components/astronomy/meteor-shower-card'
import { PhenologyCard } from '@/components/weather/phenology-card'
import { ExtremeEventsCard } from '@/components/weather/extreme-events-card'
import { SolunarCard } from '@/components/astronomy/solunar-card'
import { SolarYieldCard } from '@/components/weather/solar-yield-card'
import { WindEnergyCard } from '@/components/weather/wind-energy-card'
import { AtmosphericOpticsCard } from '@/components/astronomy/atmospheric-optics-card'
import { IndoorAirCard } from '@/components/air/indoor-air-card'
import { PressureTendencyCard } from '@/components/weather/pressure-tendency-card'
import { SleepCard } from '@/components/shared/sleep-card'
import { TropicalCard } from '@/components/weather/tropical-card'
import { VegetationCard } from '@/components/weather/vegetation-card'
import { LightningDensityCard } from '@/components/weather/lightning-density-card'
import { HailRiskCard } from '@/components/weather/hail-risk-card'
import { TornadoRiskCard } from '@/components/weather/tornado-risk-card'
import { IcingCard } from '@/components/weather/icing-card'
import { DroughtCard } from '@/components/weather/drought-card'
import { EnergyDemandCard } from '@/components/weather/energy-demand-card'
import { CropGrowthCard } from '@/components/weather/crop-growth-card'
import { HeatWaveCard } from '@/components/weather/heat-wave-card'
import { DewComfortCard } from '@/components/weather/dew-comfort-card'
import { ClimateNormalsCard } from '@/components/weather/climate-normals-card'
import { ConvectiveOutlookCard } from '@/components/weather/convective-outlook-card'
import { ThermalInversionCard } from '@/components/weather/thermal-inversion-card'
import { WinterSportsCard } from '@/components/weather/winter-sports-card'
import { UVSkinCard } from '@/components/weather/uv-skin-card'
import { FishingCard } from '@/components/weather/fishing-card'
import { AbsoluteHumidityCard } from '@/components/weather/absolute-humidity-card'
import { MicroclimateCard } from '@/components/weather/microclimate-card'
import { EvapotranspirationCard } from '@/components/weather/evapotranspiration-card'
import { WindProfileCard } from '@/components/weather/wind-profile-card'
import { PWATCard } from '@/components/weather/pwat-card'
import { OutdoorActivitiesCard } from '@/components/weather/outdoor-activities-card'
import { AviationCard } from '@/components/weather/aviation-card'
import { NightFrostCard } from '@/components/weather/night-frost-card'
import { SpotForecastCard } from '@/components/weather/spot-forecast-card'
import { HeatIndexCard } from '@/components/weather/heat-index-card'
import { FreezingLevelCard } from '@/components/weather/freezing-level-card'
import { ThunderstormProbCard } from '@/components/weather/thunderstorm-prob-card'
import { AirMassCard } from '@/components/weather/air-mass-card'
import { PollenCalendarCard } from '@/components/weather/pollen-calendar-card'
import { SunshineHoursCard } from '@/components/weather/sunshine-hours-card'
import { BeaufortCard } from '@/components/weather/beaufort-card'
import { SoilTemperatureCard } from '@/components/weather/soil-temperature-card'
import { PrecipTypeDetailCard } from '@/components/weather/precipitation-type-detail-card'
import { WaterActivityCard } from '@/components/weather/water-activity-card'
import { SolarPositionCard } from '@/components/weather/solar-position-card'
import { WeatherPatternCard } from '@/components/weather/weather-pattern-card'
import { WildlifeActivityCard } from '@/components/weather/wildlife-activity-card'
import { CityComparisonCard } from '@/components/weather/city-comparison-card'
import { ClimateZoneCard } from '@/components/weather/climate-zone-card'
import { UTCICard } from '@/components/weather/utci-card'
import { MonsoonCard } from '@/components/weather/monsoon-card'
import { ColdWaveCard } from '@/components/weather/cold-wave-card'
import { HumidityForecastCard } from '@/components/weather/humidity-forecast-card'
import { GrowingDegreeDaysCard } from '@/components/weather/growing-degree-days-card'
import { CloudCeilingCard } from '@/components/weather/cloud-ceiling-card'
import { FireWeatherIndexCard } from '@/components/weather/fire-weather-index-card'
import { GardenCard } from '@/components/weather/garden-card'
import { DashboardNav } from '@/components/shared/dashboard-nav'
import { usePreferencesStore } from '@/stores/preferences-store'
import { useNavStore } from '@/stores/nav-store'
import { ELEMENTS } from '@/lib/card-categories'
import type { CardPreferences } from '@/stores/preferences-store'
import { Skeleton } from '@/components/ui/skeleton'

// Renders two cards side-by-side; if only one is visible, it expands to full width.
function pair(a: ReactNode, b: ReactNode): ReactNode {
  if (a && b) return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{a}{b}</div>
  )
  return a || b || null
}

export function Dashboard() {
  const location = useLocationStore((s) => s.location)
  const { data: weather, isLoading: wLoading, isFetching: wFetching } = useWeather(location)
  const { data: airQuality, isLoading: aqLoading, isFetching: aqFetching } = useAirQuality(location)
  const { data: history, isLoading: histLoading } = useWeatherHistory(location)
  const { cards } = usePreferencesStore()
  const { timeView, activeElement, activeSubcategory } = useNavStore()

  const visibleKeys = useMemo(() => {
    const set = new Set<string>()
    for (const el of ELEMENTS) {
      if (activeElement && el.id !== activeElement) continue
      for (const sub of el.subcategories) {
        if (activeSubcategory && sub.name !== activeSubcategory) continue
        for (const card of sub.cards) {
          if (card.timeScope === timeView) set.add(card.key)
        }
      }
    }
    return set
  }, [timeView, activeElement, activeSubcategory])

  function vis(key: keyof CardPreferences): boolean {
    return visibleKeys.has(key) && cards[key]
  }

  function showCore(): boolean {
    if (timeView !== 'today') return false
    if (activeElement && activeElement !== 'general') return false
    if (activeSubcategory && activeSubcategory !== 'Pronóstico') return false
    return true
  }

  function showMeta(): boolean {
    return timeView === 'today' && !activeElement
  }

  if (!location) return <WelcomeScreen />

  const hasAnyCard = visibleKeys.size > 0 &&
    ([...visibleKeys] as (keyof CardPreferences)[]).some(k => cards[k])

  return (
    <>
      <DashboardNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">

        {/* Meta: alert + summary — only in "today" uncategorized */}
        {showMeta() && !wLoading && weather && (
          <>
            <AlertBanner weather={weather.current} airQuality={airQuality ?? undefined} />
            <TodaySummary current={weather.current} today={weather.daily[0]} airQuality={airQuality} />
          </>
        )}

        {/* Core weather rows — Tiempo actual, today */}
        {showCore() && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                {wLoading || !weather ? <CurrentWeatherSkeleton /> : (
                  <CurrentWeatherCard current={weather.current} location={weather.location} isFetching={wFetching} />
                )}
              </div>
              <div>
                {aqLoading || !airQuality ? <AQISkeleton /> : (
                  <AQICard data={airQuality} isFetching={aqFetching} />
                )}
              </div>
            </div>

            {wLoading || !weather ? <HourlyForecastSkeleton /> : (
              <HourlyForecastCard hourly={weather.hourly} />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                {wLoading || !weather ? <Skeleton className="h-52 rounded-3xl bg-white/5" /> : (
                  <TemperatureChart hourly={weather.hourly} />
                )}
              </div>
              <div>
                {wLoading || !weather ? <Skeleton className="h-52 rounded-3xl bg-white/5" /> : (
                  <PrecipitationChart hourly={weather.hourly} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                {wLoading || !weather ? <Skeleton className="h-52 rounded-3xl bg-white/5" /> : (
                  <WindCompass weather={weather.current} />
                )}
              </div>
              <div>
                {wLoading || !weather ? <Skeleton className="h-52 rounded-3xl bg-white/5" /> : (
                  <UVCard uvIndex={weather.current.uvIndex} uvMax={weather.daily[0].uvIndexMax} hourly={weather.hourly} />
                )}
              </div>
              <div>
                {wLoading || !weather ? <Skeleton className="h-52 rounded-3xl bg-white/5" /> : (
                  <HumidityCard weather={weather.current} />
                )}
              </div>
            </div>

            <div>
              {wLoading || !weather ? <PressureTrendSkeleton /> : (
                <PressureTrendCard location={location} />
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                {wLoading || !weather ? <DailyForecastSkeleton /> : (
                  <DailyForecastCard daily={weather.daily} />
                )}
              </div>
              <div>
                {wLoading || !weather ? <AstronomySkeleton /> : (
                  <AstronomyCard today={weather.daily[0]} tomorrow={weather.daily[1]} />
                )}
              </div>
            </div>

            {!wLoading && weather && (
              <RecommendationsCard weather={weather.current} airQuality={airQuality} />
            )}

            <EarthquakeCard />
          </>
        )}

        {/* ─── AIRE: Viento ─── */}
        {pair(vis('showWindGust') && <WindGustCard />, vis('showBeaufort') && <BeaufortCard />)}
        {vis('showWindProfile') && <WindProfileCard />}

        {/* ─── AIRE: Atmósfera ─── */}
        {pair(vis('showVisibility') && <VisibilityCard />, vis('showPressureTendency') && <PressureTendencyCard />)}
        {pair(vis('showAtmosphericOptics') && <AtmosphericOpticsCard />, vis('showThermalInversion') && <ThermalInversionCard />)}
        {pair(vis('showMicroclimate') && <MicroclimateCard />, vis('showWeatherPattern') && <WeatherPatternCard />)}

        {/* ─── AIRE: Calidad del Aire ─── */}
        {pair(vis('showAQIWHO') && <AQIWHOCard />, vis('showHealthIndex') && <HealthIndexCard />)}
        {pair(vis('showIndoorAir') && <IndoorAirCard />, vis('showSmoke') && <SmokeCard />)}
        {vis('showAQIForecast') && <AQIForecastCard />}

        {/* ─── AIRE: Nieve e Invierno ─── */}
        {pair(vis('showFog') && <FogCard />, vis('showIcing') && <IcingCard />)}
        {pair(vis('showWinter') && <WinterCard />, vis('showWinterSports') && <WinterSportsCard />)}

        {/* ─── AIRE: Aviación ─── */}
        {pair(vis('showCloudCover') && <CloudCoverCard />, vis('showCloudCeiling') && <CloudCeilingCard />)}
        {pair(vis('showAviation') && <AviationCard />, vis('showFreezingLevel') && <FreezingLevelCard />)}

        {/* ─── GENERAL: Pronóstico ─── */}
        {pair(vis('showSpotForecast') && <SpotForecastCard />, vis('showHeatmap') && <WeatherHeatmap />)}
        {pair(vis('showTomorrow') && <TomorrowCard />, vis('showWeekend') && <WeekendCard />)}
        {pair(vis('showMap') && <WeatherMap />, vis('showExtendedForecast') && <ExtendedForecastCard />)}

        {/* ─── AGUA: Tormentas y Peligros ─── */}
        {pair(vis('showThunderstormProb') && <ThunderstormProbCard />, vis('showAirMass') && <AirMassCard />)}
        {pair(vis('showLightning') && <LightningCard />, vis('showLightningDensity') && <LightningDensityCard />)}
        {pair(vis('showThunderstorm') && <ThunderstormCard />, vis('showHail') && <HailRiskCard />)}
        {pair(vis('showFireWeather') && <FireWeatherCard />, vis('showFireWeatherIndex') && <FireWeatherIndexCard />)}
        {pair(vis('showConvectiveOutlook') && <ConvectiveOutlookCard />, vis('showTornado') && <TornadoRiskCard />)}
        {pair(vis('showHeatWave') && <HeatWaveCard />, vis('showColdWave') && <ColdWaveCard />)}
        {vis('showTropical') && <TropicalCard />}

        {/* ─── AGUA: Mar y Ríos ─── */}
        {pair(vis('showMarine') && <MarineCard />, vis('showFlood') && <FloodCard />)}

        {/* ─── AGUA: Lluvia y Humedad ─── */}
        {pair(vis('showPrecipType') && <PrecipTypeCard />, vis('showPrecipTypeDetail') && <PrecipTypeDetailCard />)}
        {pair(vis('showPrecipAccum') && <PrecipAccumulationCard />, vis('showNightFrost') && <NightFrostCard />)}
        {pair(vis('showEvapotranspiration') && <EvapotranspirationCard />, vis('showAbsoluteHumidity') && <AbsoluteHumidityCard />)}
        {pair(vis('showDewComfort') && <DewComfortCard />, vis('showPWAT') && <PWATCard />)}
        {pair(vis('showHumidityForecast') && <HumidityForecastCard />, vis('showMonsoon') && <MonsoonCard />)}
        {vis('showDrought') && <DroughtCard />}

        {/* ─── GENERAL: Confort y Salud ─── */}
        {pair(vis('showUTCI') && <UTCICard />, vis('showHeatIndex') && <HeatIndexCard />)}
        {pair(vis('showComfort') && <ComfortCard />, vis('showBioclimate') && <BioclimateCard />)}
        {pair(vis('showHeatSafety') && <HeatSafetyCard />, vis('showSleep') && <SleepCard />)}
        {pair(vis('showClothing') && <ClothingCard />, vis('showUVSkin') && <UVSkinCard />)}

        {/* ─── TIERRA: Plantas y Polen ─── */}
        {vis('showPollen') && <PollenCard />}
        {pair(vis('showPollenForecast') && <PollenForecastCard />, vis('showPollenCalendar') && <PollenCalendarCard />)}
        {vis('showPhenology') && <PhenologyCard />}

        {/* ─── CIELO: Sol ─── */}
        {pair(vis('showSolar') && <SolarCard />, vis('showSunCalendar') && <SunCalendarCard />)}
        {pair(vis('showGoldenHour') && <GoldenHourCard />, vis('showSolarPosition') && <SolarPositionCard />)}
        {pair(vis('showUVForecast') && <UVForecastCard />, vis('showSunshineHours') && <SunshineHoursCard />)}
        {vis('showDaylightYear') && <DaylightYearCard />}

        {/* ─── CIELO: Luna y Noche ─── */}
        {pair(vis('showAPOD') && <APODCard />, vis('showCelestial') && <CelestialCard />)}
        {pair(vis('showMoonCalendar') && <MoonCalendarCard />, vis('showStargazing') && <StargazingCard />)}
        {pair(vis('showSpaceWeather') && <SpaceWeatherCard />, vis('showMoonAlmanac') && <MoonAlmanacCard />)}
        {vis('showMeteorShower') && <MeteorShowerCard />}

        {/* ─── TIERRA: Suelo y Agricultura ─── */}
        {pair(vis('showSoil') && <SoilCard />, vis('showAgro') && <AgroCard />)}
        {pair(vis('showGarden') && <GardenCard />, vis('showSoilTemperature') && <SoilTemperatureCard />)}
        {pair(vis('showCropGrowth') && <CropGrowthCard />, vis('showGrowingDegreeDays') && <GrowingDegreeDaysCard />)}
        {vis('showVegetation') && <VegetationCard />}

        {/* ─── TIERRA: Fauna ─── */}
        {pair(vis('showWildlifeActivity') && <WildlifeActivityCard />, vis('showSolunar') && <SolunarCard />)}
        {vis('showFishing') && <FishingCard />}

        {/* ─── CIELO: Energía Renovable ─── */}
        {pair(vis('showWindEnergy') && <WindEnergyCard />, vis('showSolarYield') && <SolarYieldCard />)}
        {pair(vis('showEnergyDemand') && <EnergyDemandCard />, vis('showRenewable') && <RenewableCard />)}

        {/* ─── GENERAL: Actividades ─── */}
        {pair(vis('showActivities') && <ActivitiesCard />, vis('showOutdoorActivities') && <OutdoorActivitiesCard />)}
        {pair(vis('showBeach') && <BeachCard />, vis('showWaterActivity') && <WaterActivityCard />)}
        {pair(vis('showTraining') && <TrainingCard />, vis('showDrivingSafety') && <DrivingSafetyCard />)}

        {/* ─── GENERAL: Historia ─── */}
        {vis('showHistory') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              {histLoading || !history ? <HistoryChartSkeleton /> : (
                <HistoryChart history={history} />
              )}
            </div>
            <div>
              {histLoading || !history || !weather ? (
                <Skeleton className="h-64 rounded-3xl bg-white/5" />
              ) : (
                <ComparisonCard today={weather.daily[0]} history={history} />
              )}
            </div>
          </div>
        )}
        {vis('showMonthlyStats') && <MonthlyStatsCard location={location} />}
        {pair(vis('showRecords') && <RecordsCard />, vis('showClimateAnomaly') && <ClimateAnomalyCard />)}
        {pair(vis('showClimateNormals') && <ClimateNormalsCard />, vis('showExtremeEvents') && <ExtremeEventsCard />)}

        {/* ─── GENERAL: Global ─── */}
        {pair(vis('showCityComparison') && <CityComparisonCard />, vis('showWorldClock') && <WorldClock />)}
        {pair(vis('showClimateZone') && <ClimateZoneCard />, vis('showShare') && <SharePanel />)}

        {/* Empty state */}
        {!showCore() && !hasAnyCard && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-4xl mb-4">
              {activeElement ? ELEMENTS.find(e => e.id === activeElement)?.icon ?? '📭' : '📭'}
            </div>
            <p className="text-slate-400 text-sm font-medium">
              {activeSubcategory
                ? `Sin tarjetas de "${activeSubcategory}" para esta vista`
                : activeElement
                  ? `Sin tarjetas de "${ELEMENTS.find(e => e.id === activeElement)?.name}" para esta vista`
                  : 'No hay tarjetas para esta vista'}
            </p>
            <p className="text-slate-600 text-xs mt-1">
              Cambia el filtro de tiempo o activa tarjetas con ⚙️
            </p>
          </div>
        )}

      </main>
    </>
  )
}
