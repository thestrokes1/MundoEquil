'use client'
import { useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/stores/theme-store'

export function ThemeToggle() {
  const { dark, toggle } = useThemeStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.classList.toggle('light-mode', !dark)
    document.body.style.background = dark
      ? ''
      : 'linear-gradient(135deg, #e0f2fe, #f0f9ff, #e0e7ff)'
  }, [dark])

  return (
    <button
      onClick={toggle}
      title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-yellow-400 transition-colors"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
