'use client'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Camera } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface APODData {
  title: string
  date: string
  explanation: string
  url: string
  hdurl?: string
  mediaType: 'image' | 'video'
  copyright?: string
}

export function APODCard() {
  const { data, isLoading } = useQuery<APODData>({
    queryKey: ['apod'],
    queryFn: () => fetch('/api/apod').then((r) => r.json()),
    staleTime: 3_600_000,
    refetchInterval: false,
  })

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-48 bg-white/10" />
        <Skeleton className="h-56 bg-white/10 rounded-2xl" />
        <Skeleton className="h-4 w-3/4 bg-white/10" />
        <Skeleton className="h-4 w-full bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data) return null

  const shortDesc = data.explanation.length > 280
    ? data.explanation.slice(0, 280) + '…'
    : data.explanation

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 backdrop-blur-md overflow-hidden">
      <div className="p-5 pb-0 flex items-center gap-2">
        <Camera className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Foto Astronómica del Día — NASA
        </h3>
        <span className="text-xs text-slate-600 ml-auto">{data.date}</span>
      </div>

      {/* Image / Video placeholder */}
      <div className="mt-4 mx-5 rounded-2xl overflow-hidden relative group">
        {data.url ? (
          <img
            src={data.url}
            alt={data.title}
            className="w-full object-cover max-h-72"
            loading="lazy"
          />
        ) : data.mediaType === 'video' ? (
          <div className="w-full h-40 flex flex-col items-center justify-center bg-indigo-900/30 text-slate-400 gap-2">
            <span className="text-3xl">🎬</span>
            <span className="text-xs">Video — ver en NASA APOD</span>
          </div>
        ) : (
          <div className="w-full h-40 flex items-center justify-center bg-white/5 text-slate-600 text-xs">Sin imagen disponible</div>
        )}
        {data.hdurl && (
          <a
            href={data.hdurl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-3 right-3 p-2 rounded-xl bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="Ver en alta resolución"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      <div className="p-5 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-base font-bold text-slate-100">{data.title}</h4>
        </div>
        {data.copyright && (
          <p className="text-[10px] text-slate-600">© {data.copyright.trim()}</p>
        )}
        <p className="text-xs text-slate-400 leading-relaxed">{shortDesc}</p>
      </div>
    </div>
  )
}
