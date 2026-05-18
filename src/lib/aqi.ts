import type { AQICategory } from '@/types/weather'

export interface AQIInfo {
  category: AQICategory
  label: string
  color: string
  bg: string
  border: string
  recommendation: string
}

export function getAQIInfo(aqi: number): AQIInfo {
  if (aqi <= 50)  return {
    category: 'good',
    label: 'Buena',
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-500',
    recommendation: 'La calidad del aire es satisfactoria. Actividades al aire libre son ideales.',
  }
  if (aqi <= 100) return {
    category: 'moderate',
    label: 'Moderada',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    border: 'border-yellow-500',
    recommendation: 'Calidad aceptable. Personas sensibles pueden experimentar molestias.',
  }
  if (aqi <= 150) return {
    category: 'sensitive',
    label: 'Dañina para grupos sensibles',
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950',
    border: 'border-orange-500',
    recommendation: 'Grupos de riesgo deben reducir actividad física prolongada al aire libre.',
  }
  if (aqi <= 200) return {
    category: 'unhealthy',
    label: 'Dañina',
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950',
    border: 'border-red-500',
    recommendation: 'Toda la población puede experimentar efectos en la salud. Limitar actividades.',
  }
  if (aqi <= 300) return {
    category: 'very-unhealthy',
    label: 'Muy dañina',
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950',
    border: 'border-purple-500',
    recommendation: 'Alerta de salud. Evitar actividades al aire libre prolongadas.',
  }
  return {
    category: 'hazardous',
    label: 'Peligrosa',
    color: 'text-rose-800',
    bg: 'bg-rose-100 dark:bg-rose-950',
    border: 'border-rose-700',
    recommendation: 'Emergencia sanitaria. Toda la población debe quedarse en interiores.',
  }
}

export function pm25ToAQI(pm25: number): number {
  if (pm25 <= 12)    return linearScale(pm25, 0, 12, 0, 50)
  if (pm25 <= 35.4)  return linearScale(pm25, 12.1, 35.4, 51, 100)
  if (pm25 <= 55.4)  return linearScale(pm25, 35.5, 55.4, 101, 150)
  if (pm25 <= 150.4) return linearScale(pm25, 55.5, 150.4, 151, 200)
  if (pm25 <= 250.4) return linearScale(pm25, 150.5, 250.4, 201, 300)
  return Math.min(500, linearScale(pm25, 250.5, 500.4, 301, 500))
}

function linearScale(val: number, low1: number, high1: number, low2: number, high2: number) {
  return Math.round(((high2 - low2) / (high1 - low1)) * (val - low1) + low2)
}
