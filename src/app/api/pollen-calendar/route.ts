import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 86400

export interface PollenCalendarData {
  hemisphere: 'north' | 'south'
  currentMonth: number
  species: PollenSpecies[]
  peakMonth: string
  currentAllergens: string[]
}

export interface PollenSpecies {
  name: string
  emoji: string
  months: number[]
  peakMonths: number[]
  intensity: number[]
  color: string
  type: 'tree' | 'grass' | 'weed' | 'mold'
}

const SPECIES_NORTH: PollenSpecies[] = [
  {
    name: 'Abedul', emoji: '🌳', type: 'tree', color: '#84cc16',
    months: [3,4,5], peakMonths: [4,5],
    intensity: [0,0,0,2,5,5,3,0,0,0,0,0],
  },
  {
    name: 'Ciprés', emoji: '🌲', type: 'tree', color: '#16a34a',
    months: [1,2,3,4], peakMonths: [2,3],
    intensity: [3,5,5,3,0,0,0,0,0,0,0,1],
  },
  {
    name: 'Olivo', emoji: '🫒', type: 'tree', color: '#a3e635',
    months: [4,5,6,7], peakMonths: [5,6],
    intensity: [0,0,0,2,5,5,3,1,0,0,0,0],
  },
  {
    name: 'Gramíneas', emoji: '🌾', type: 'grass', color: '#facc15',
    months: [5,6,7,8], peakMonths: [6,7],
    intensity: [0,0,0,0,2,5,5,3,1,0,0,0],
  },
  {
    name: 'Ambrosia', emoji: '🌿', type: 'weed', color: '#f97316',
    months: [8,9,10], peakMonths: [8,9],
    intensity: [0,0,0,0,0,0,0,3,5,4,1,0],
  },
  {
    name: 'Plátano', emoji: '🍃', type: 'tree', color: '#38bdf8',
    months: [3,4,5], peakMonths: [4],
    intensity: [0,0,1,4,5,2,0,0,0,0,0,0],
  },
  {
    name: 'Cladosporium', emoji: '🍄', type: 'mold', color: '#a78bfa',
    months: [6,7,8,9,10], peakMonths: [7,8],
    intensity: [1,1,1,1,2,3,5,5,4,3,2,1],
  },
]

const SPECIES_SOUTH: PollenSpecies[] = [
  {
    name: 'Gramíneas', emoji: '🌾', type: 'grass', color: '#facc15',
    months: [11,12,1,2], peakMonths: [12,1],
    intensity: [2,5,5,3,1,0,0,0,0,0,0,2],
  },
  {
    name: 'Ciprés', emoji: '🌲', type: 'tree', color: '#16a34a',
    months: [8,9,10,11], peakMonths: [9,10],
    intensity: [0,0,0,0,0,0,0,2,5,5,3,0],
  },
  {
    name: 'Parietaria', emoji: '🌿', type: 'weed', color: '#f97316',
    months: [9,10,11,12,1,2,3], peakMonths: [10,11],
    intensity: [2,2,1,0,0,0,1,2,4,5,5,3],
  },
  {
    name: 'Acacia', emoji: '🌼', type: 'tree', color: '#fbbf24',
    months: [7,8,9], peakMonths: [8],
    intensity: [0,0,0,0,0,0,2,5,4,1,0,0],
  },
  {
    name: 'Cladosporium', emoji: '🍄', type: 'mold', color: '#a78bfa',
    months: [12,1,2,3], peakMonths: [1,2],
    intensity: [3,5,5,4,2,1,1,1,1,1,2,3],
  },
]

const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  if (!lat) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const latNum = parseFloat(lat)
  const hemisphere: PollenCalendarData['hemisphere'] = latNum >= 0 ? 'north' : 'south'
  const species = hemisphere === 'north' ? SPECIES_NORTH : SPECIES_SOUTH
  const currentMonth = new Date().getMonth() + 1

  const active = species.filter(s => s.intensity[currentMonth - 1] >= 2)
  const currentAllergens = active.map(s => `${s.emoji} ${s.name}`)

  const peakSpecies = species.reduce((best, s) => {
    const myPeakVal = Math.max(...s.intensity)
    const bPeakVal  = Math.max(...best.intensity)
    return myPeakVal > bPeakVal ? s : best
  }, species[0])
  const peakMo = peakSpecies.peakMonths[0]
  const peakMonth = `${MONTH_LABELS[peakMo - 1]} — ${peakSpecies.name}`

  return NextResponse.json({
    hemisphere,
    currentMonth,
    species,
    peakMonth,
    currentAllergens,
  } satisfies PollenCalendarData)
}
