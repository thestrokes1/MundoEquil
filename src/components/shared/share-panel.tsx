'use client'
import { useState } from 'react'
import { useLocationStore } from '@/stores/location-store'
import { Copy, Check, Share2, Code } from 'lucide-react'

export function SharePanel() {
  const location = useLocationStore(s => s.location)
  const [copied, setCopied] = useState<'url' | 'embed' | 'badge' | null>(null)

  if (!location) return null

  const base = typeof window !== 'undefined' ? window.location.origin : ''
  const params = new URLSearchParams({
    lat: String(location.lat),
    lon: String(location.lon),
    name: location.name,
    country: location.country,
  })
  const shareUrl = `${base}/?${params}`
  const widgetUrl = `${base}/api/widget?${params}`
  const embedCode = `<img src="${widgetUrl}" alt="Clima en ${location.name}" width="320" height="96" style="border-radius:16px">`
  const markdownBadge = `[![Clima en ${location.name}](${widgetUrl})](${shareUrl})`

  const copy = async (text: string, key: typeof copied) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center gap-2 mb-4">
        <Share2 className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Compartir / Integrar</h3>
      </div>

      <div className="space-y-3">
        {/* Share URL */}
        <div>
          <div className="text-xs text-slate-500 mb-1.5">Enlace directo</div>
          <div className="flex gap-2">
            <code className="flex-1 text-[10px] bg-white/5 rounded-xl px-3 py-2 text-slate-300 truncate border border-white/5">
              {shareUrl}
            </code>
            <button
              onClick={() => copy(shareUrl, 'url')}
              className="shrink-0 p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-400 transition-colors"
            >
              {copied === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Widget preview */}
        <div>
          <div className="text-xs text-slate-500 mb-1.5">Vista previa del widget</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={widgetUrl} alt={`Clima en ${location.name}`} width={320} height={96} className="rounded-2xl" />
        </div>

        {/* Embed HTML */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
            <Code className="w-3 h-3" />
            Código HTML
          </div>
          <div className="flex gap-2">
            <code className="flex-1 text-[10px] bg-white/5 rounded-xl px-3 py-2 text-slate-300 truncate border border-white/5">
              {embedCode}
            </code>
            <button
              onClick={() => copy(embedCode, 'embed')}
              className="shrink-0 p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-400 transition-colors"
            >
              {copied === 'embed' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Markdown badge */}
        <div>
          <div className="text-xs text-slate-500 mb-1.5">Badge Markdown (README)</div>
          <div className="flex gap-2">
            <code className="flex-1 text-[10px] bg-white/5 rounded-xl px-3 py-2 text-slate-300 truncate border border-white/5">
              {markdownBadge}
            </code>
            <button
              onClick={() => copy(markdownBadge, 'badge')}
              className="shrink-0 p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-400 transition-colors"
            >
              {copied === 'badge' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
