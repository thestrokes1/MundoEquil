import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTemp(celsius: number, unit: 'celsius' | 'fahrenheit' = 'celsius'): string {
  if (unit === 'fahrenheit') return `${Math.round(celsius * 9 / 5 + 32)}°F`
  return `${Math.round(celsius)}°C`
}

export function formatSpeed(kmh: number, unit: 'kmh' | 'mph' | 'ms' = 'kmh'): string {
  if (unit === 'mph') return `${Math.round(kmh * 0.621371)} mph`
  if (unit === 'ms')  return `${Math.round(kmh / 3.6)} m/s`
  return `${Math.round(kmh)} km/h`
}

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export function formatHour(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

export function timeSince(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (seconds < 10)   return 'ahora mismo'
  if (seconds < 60)   return `hace ${seconds}s`
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)}min`
  return `hace ${Math.floor(seconds / 3600)}h`
}

export function getMagnitudeColor(magnitude: number): string {
  if (magnitude < 2) return 'text-green-400'
  if (magnitude < 4) return 'text-yellow-400'
  if (magnitude < 6) return 'text-orange-400'
  if (magnitude < 7) return 'text-red-400'
  return 'text-red-600'
}
