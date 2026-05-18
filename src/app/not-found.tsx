import Link from 'next/link'
import { Globe2 } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 gap-6">
      <Globe2 className="w-12 h-12 text-sky-400 opacity-60" />
      <div className="space-y-2">
        <h1 className="text-5xl font-bold text-slate-100">404</h1>
        <p className="text-slate-400 text-sm">Esta página no existe.</p>
      </div>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors"
      >
        Volver al panel
      </Link>
    </div>
  )
}
