export interface Coordinates {
  lat: number
  lon: number
}

export interface Location {
  name: string
  country: string
  state?: string
  lat: number
  lon: number
}

export interface CurrentWeather {
  temperature: number
  feelsLike: number
  tempMin: number
  tempMax: number
  humidity: number
  pressure: number
  visibility: number
  windSpeed: number
  windDeg: number
  windGust?: number
  description: string
  icon: string
  cloudiness: number
  dewPoint: number
  uvIndex: number
  updatedAt: string
}

export interface HourlyForecast {
  time: string
  temperature: number
  feelsLike: number
  humidity: number
  precipitationProbability: number
  precipitation: number
  windSpeed: number
  weatherCode: number
  isDay: boolean
}

export interface DailyForecast {
  date: string
  tempMax: number
  tempMin: number
  precipitationProbability: number
  precipitation: number
  windSpeedMax: number
  uvIndexMax: number
  weatherCode: number
  sunrise: string
  sunset: string
}

export interface WeatherData {
  location: Location
  current: CurrentWeather
  hourly: HourlyForecast[]
  daily: DailyForecast[]
}

export interface AirQuality {
  aqi: number
  category: AQICategory
  pm25: number
  pm10: number
  o3: number
  no2: number
  co: number
  so2: number
  updatedAt: string
}

export type AQICategory =
  | 'good'
  | 'moderate'
  | 'sensitive'
  | 'unhealthy'
  | 'very-unhealthy'
  | 'hazardous'

export interface AstronomyData {
  sunrise: string
  sunset: string
  daylightDuration: number
  moonPhase: number
  moonrise?: string
  moonset?: string
  solarNoon?: string
}

export interface Earthquake {
  id: string
  magnitude: number
  place: string
  time: string
  lat: number
  lon: number
  depth: number
  url: string
}

export interface WeatherAlert {
  event: string
  headline: string
  description: string
  severity: 'minor' | 'moderate' | 'severe' | 'extreme'
  start: string
  end: string
}

export type WeatherCode = number
export type WindDirection = string
export type TemperatureUnit = 'celsius' | 'fahrenheit'
export type SpeedUnit = 'kmh' | 'mph' | 'ms'
