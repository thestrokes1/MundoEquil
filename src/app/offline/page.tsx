import Link from 'next/link'
import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 gap-6">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 border border-white/10">
        <WifiOff className="w-8 h-8 text-slate-400" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-100">Sin conexión</h1>
        <p className="text-slate-400 text-sm max-w-xs">
          Los datos ambientales requieren internet. Conéctate y vuelve a intentarlo.
        </p>
      </div>
      <Link
        href="/"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors"
      >
        Reintentar
      </Link>
    </div>
  )
}
