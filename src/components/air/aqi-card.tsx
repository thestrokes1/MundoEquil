'use client'
import { Wind, AlertTriangle } from 'lucide-react'
import { getAQIInfo } from '@/lib/aqi'
import { DataFreshness } from '@/components/shared/data-freshness'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { AirQuality } from '@/types/weather'

interface Props {
  data: AirQuality
  isFetching?: boolean
}

interface PollutantRowProps {
  label: string
  value: number
  unit: string
  max: number
  color: string
}

function PollutantRow({ label, value, unit, max, color }: PollutantRowProps) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-mono">{value.toFixed(1)} {unit}</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function AQICard({ data, isFetching }: Props) {
  const info = getAQIInfo(data.aqi)
  const radius = 52
  const circ = 2 * Math.PI * radius
  const pct = Math.min(data.aqi / 300, 1)
  const dash = pct * circ

  return (
    <div className={cn('rounded-3xl border backdrop-blur-md p-5 space-y-4', info.bg, info.border)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Calidad del Aire
        </h3>
        <DataFreshness updatedAt={data.updatedAt} refetching={isFetching} />
      </div>

      <div className="flex items-center gap-6">
        {/* Gauge SVG */}
        <div className="relative shrink-0">
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
            <circle
              cx="64" cy="64" r={radius}
              fill="none"
              stroke={data.aqi <= 50 ? '#22c55e' : data.aqi <= 100 ? '#eab308' : data.aqi <= 150 ? '#f97316' : data.aqi <= 200 ? '#ef4444' : data.aqi <= 300 ? '#a855f7' : '#9f1239'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              transform="rotate(-90 64 64)"
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-100">{data.aqi}</span>
            <span className="text-[10px] text-slate-400">AQI</span>
          </div>
        </div>

        <div className="flex-1 space-y-1.5">
          <div className={`text-lg font-bold ${info.color}`}>{info.label}</div>
          <p className="text-xs text-slate-400 leading-relaxed">{info.recommendation}</p>
        </div>
      </div>

      <div className="space-y-2.5 pt-2 border-t border-white/10">
        <PollutantRow label="PM2.5" value={data.pm25} unit="μg/m³" max={75} color="bg-orange-400" />
        <PollutantRow label="PM10"  value={data.pm10} unit="μg/m³" max={150} color="bg-yellow-400" />
        <PollutantRow label="O₃"    value={data.o3}   unit="μg/m³" max={240} color="bg-blue-400" />
        <PollutantRow label="NO₂"   value={data.no2}  unit="μg/m³" max={200} color="bg-purple-400" />
        <PollutantRow label="CO"    value={data.co}   unit="mg/m³" max={10}  color="bg-red-400" />
      </div>
    </div>
  )
}

export function AQISkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-4">
      <Skeleton className="h-4 w-36 bg-white/10" />
      <div className="flex gap-6">
        <Skeleton className="h-32 w-32 rounded-full bg-white/10 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-24 bg-white/10" />
          <Skeleton className="h-4 w-full bg-white/10" />
          <Skeleton className="h-4 w-3/4 bg-white/10" />
        </div>
      </div>
    </div>
  )
}
