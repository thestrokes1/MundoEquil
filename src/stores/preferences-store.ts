import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CardPreferences {
  showMarine: boolean
  showFlood: boolean
  showPollen: boolean
  showSolar: boolean
  showLightning: boolean
  showAgro: boolean
  showAQIForecast: boolean
  showSpaceWeather: boolean
  showWorldClock: boolean
  showMap: boolean
  showShare: boolean
  showMonthlyStats: boolean
  showHistory: boolean
  showAPOD: boolean
  showClothing: boolean
  showVisibility: boolean
  showHeatmap: boolean
  showCelestial: boolean
  showWindGust: boolean
  showExtendedForecast: boolean
  showFireWeather: boolean
  showComfort: boolean
  showRenewable: boolean
  showCloudCover: boolean
  showPrecipType: boolean
  showActivities: boolean
  showSunCalendar: boolean
  showUVForecast: boolean
  showPollenForecast: boolean
  showAQIWHO: boolean
  showHealthIndex: boolean
  showMoonCalendar: boolean
  showDaylightYear: boolean
  showStargazing: boolean
  showDrivingSafety: boolean
  showWeekend: boolean
  showTomorrow: boolean
  showPrecipAccum: boolean
  showGoldenHour: boolean
  showRecords: boolean
  showHeatSafety: boolean
  showSoil: boolean
  showThunderstorm: boolean
  showWinter: boolean
  showFog: boolean
  showBioclimate: boolean
  showSmoke: boolean
  showBeach: boolean
  showTraining: boolean
  showClimateAnomaly: boolean
  showMoonAlmanac: boolean
  showMeteorShower: boolean
  showPhenology: boolean
  showExtremeEvents: boolean
  showSolunar: boolean
  showSolarYield: boolean
  showWindEnergy: boolean
  showAtmosphericOptics: boolean
  showIndoorAir: boolean
  showPressureTendency: boolean
  showSleep: boolean
  showTropical: boolean
  showVegetation: boolean
  showLightningDensity: boolean
  showHail: boolean
  showTornado: boolean
  showIcing: boolean
  showDrought: boolean
  showEnergyDemand: boolean
  showCropGrowth: boolean
  showHeatWave: boolean
  showDewComfort: boolean
  showClimateNormals: boolean
  showConvectiveOutlook: boolean
  showThermalInversion: boolean
  showWinterSports: boolean
  showUVSkin: boolean
  showFishing: boolean
  showAbsoluteHumidity: boolean
  showMicroclimate: boolean
  showEvapotranspiration: boolean
  showWindProfile: boolean
  showPWAT: boolean
  showOutdoorActivities: boolean
  showAviation: boolean
  showNightFrost: boolean
  showSpotForecast: boolean
  showHeatIndex: boolean
  showFreezingLevel: boolean
  showThunderstormProb: boolean
  showAirMass: boolean
  showPollenCalendar: boolean
  showSunshineHours: boolean
  showBeaufort: boolean
  showSoilTemperature: boolean
  showPrecipTypeDetail: boolean
  showWaterActivity: boolean
  showSolarPosition: boolean
  showWeatherPattern: boolean
  showWildlifeActivity: boolean
  showCityComparison: boolean
  showClimateZone: boolean
  showUTCI: boolean
  showMonsoon: boolean
  showColdWave: boolean
  showHumidityForecast: boolean
  showGrowingDegreeDays: boolean
  showCloudCeiling: boolean
  showFireWeatherIndex: boolean
  showGarden: boolean
}

interface PreferencesStore {
  cards: CardPreferences
  setCard: (key: keyof CardPreferences, value: boolean) => void
  resetCards: () => void
}

const DEFAULT_CARDS: CardPreferences = {
  showMarine: true,
  showFlood: true,
  showPollen: true,
  showSolar: true,
  showLightning: true,
  showAgro: true,
  showAQIForecast: true,
  showSpaceWeather: true,
  showWorldClock: true,
  showMap: true,
  showShare: true,
  showMonthlyStats: true,
  showHistory: true,
  showAPOD: true,
  showClothing: true,
  showVisibility: true,
  showHeatmap: true,
  showCelestial: true,
  showWindGust: true,
  showExtendedForecast: true,
  showFireWeather: true,
  showComfort: true,
  showRenewable: true,
  showCloudCover: true,
  showPrecipType: true,
  showActivities: true,
  showSunCalendar: true,
  showUVForecast: true,
  showPollenForecast: true,
  showAQIWHO: true,
  showHealthIndex: true,
  showMoonCalendar: true,
  showDaylightYear: true,
  showStargazing: true,
  showDrivingSafety: true,
  showWeekend: true,
  showTomorrow: true,
  showPrecipAccum: true,
  showGoldenHour: true,
  showRecords: true,
  showHeatSafety: true,
  showSoil: true,
  showThunderstorm: true,
  showWinter: true,
  showFog: true,
  showBioclimate: true,
  showSmoke: true,
  showBeach: true,
  showTraining: true,
  showClimateAnomaly: true,
  showMoonAlmanac: true,
  showMeteorShower: true,
  showPhenology: true,
  showExtremeEvents: true,
  showSolunar: true,
  showSolarYield: true,
  showWindEnergy: true,
  showAtmosphericOptics: true,
  showIndoorAir: true,
  showPressureTendency: true,
  showSleep: true,
  showTropical: true,
  showVegetation: true,
  showLightningDensity: true,
  showHail: true,
  showTornado: true,
  showIcing: true,
  showDrought: true,
  showEnergyDemand: true,
  showCropGrowth: true,
  showHeatWave: true,
  showDewComfort: true,
  showClimateNormals: true,
  showConvectiveOutlook: true,
  showThermalInversion: true,
  showWinterSports: true,
  showUVSkin: true,
  showFishing: true,
  showAbsoluteHumidity: true,
  showMicroclimate: true,
  showEvapotranspiration: true,
  showWindProfile: true,
  showPWAT: true,
  showOutdoorActivities: true,
  showAviation: true,
  showNightFrost: true,
  showSpotForecast: true,
  showHeatIndex: true,
  showFreezingLevel: true,
  showThunderstormProb: true,
  showAirMass: true,
  showPollenCalendar: true,
  showSunshineHours: true,
  showBeaufort: true,
  showSoilTemperature: true,
  showPrecipTypeDetail: true,
  showWaterActivity: true,
  showSolarPosition: true,
  showWeatherPattern: true,
  showWildlifeActivity: true,
  showCityComparison: true,
  showClimateZone: true,
  showUTCI: true,
  showMonsoon: true,
  showColdWave: true,
  showHumidityForecast: true,
  showGrowingDegreeDays: true,
  showCloudCeiling: true,
  showFireWeatherIndex: true,
  showGarden: true,
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      cards: DEFAULT_CARDS,
      setCard: (key, value) =>
        set(s => ({ cards: { ...s.cards, [key]: value } })),
      resetCards: () => set({ cards: DEFAULT_CARDS }),
    }),
    { name: 'mundoequil-preferences' }
  )
)
