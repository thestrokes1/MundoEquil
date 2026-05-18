'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Settings, X, RotateCcw, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { usePreferencesStore, CardPreferences } from '@/stores/preferences-store'
import { CATEGORIES, CardMeta } from '@/lib/card-categories'

export function PreferencesButton() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(
    () => Object.fromEntries(CATEGORIES.map(c => [c.name, true]))
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const { cards, setCard, resetCards } = usePreferencesStore()

  const allCards = CATEGORIES.flatMap(c => c.cards)
  const activeCount = allCards.filter(c => cards[c.key]).length

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase()
    return allCards.filter(c => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q))
  }, [search])

  function toggleCategory(name: string) {
    setCollapsed(prev => ({ ...prev, [name]: !prev[name] }))
  }

  function toggleCategoryAll(entries: CardMeta[], on: boolean) {
    entries.forEach(e => setCard(e.key, on))
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 transition-colors"
        title="Preferencias"
      >
        <Settings className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Tarjetas</span>
        {activeCount < allCards.length && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-sky-500 rounded-full text-[8px] flex items-center justify-center text-white font-bold">
            {allCards.length - activeCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-3 flex-shrink-0">
              <h2 className="text-sm font-semibold text-slate-300">Personalizar tarjetas</h2>
              <div className="flex gap-2">
                <button onClick={resetCards} className="p-1.5 rounded-xl hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors" title="Restablecer todo">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-xl hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="px-5 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar tarjeta..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-transparent text-xs text-slate-300 placeholder-slate-600 outline-none flex-1"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-slate-600 hover:text-slate-400">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div ref={scrollRef} className="overflow-y-auto flex-1 px-3 pb-3">
              {filtered ? (
                <div className="space-y-0.5">
                  {filtered.length === 0 && (
                    <div className="text-center text-slate-600 text-xs py-8">Sin resultados</div>
                  )}
                  {filtered.map(({ key, label, desc }) => (
                    <CardRow key={key} cardKey={key} label={label} desc={desc} checked={cards[key]} onChange={v => setCard(key, v)} />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {CATEGORIES.map(cat => {
                    const isCollapsed = collapsed[cat.name]
                    const allOn = cat.cards.every(c => cards[c.key])
                    const activeInCat = cat.cards.filter(c => cards[c.key]).length
                    return (
                      <div key={cat.name} className="rounded-2xl border border-white/5 overflow-hidden">
                        <div
                          className="flex items-center gap-2 px-3 py-2 bg-white/5 cursor-pointer select-none hover:bg-white/8 transition-colors"
                          onClick={() => toggleCategory(cat.name)}
                        >
                          <span className="text-sm">{cat.icon}</span>
                          <span className="text-xs font-semibold text-slate-300 flex-1">{cat.name}</span>
                          <span className="text-[9px] text-slate-600">{activeInCat}/{cat.cards.length}</span>
                          <button
                            className={`text-[9px] px-1.5 py-0.5 rounded-md border transition-colors ${allOn ? 'text-sky-400 border-sky-500/30 bg-sky-500/10' : 'text-slate-600 border-white/10 hover:text-slate-400'}`}
                            onClick={e => { e.stopPropagation(); toggleCategoryAll(cat.cards, !allOn) }}
                          >
                            {allOn ? 'Todo ✓' : 'Todo'}
                          </button>
                          {isCollapsed ? <ChevronRight className="w-3 h-3 text-slate-600" /> : <ChevronDown className="w-3 h-3 text-slate-600" />}
                        </div>
                        {!isCollapsed && (
                          <div className="space-y-0.5 p-1.5">
                            {cat.cards.map(({ key, label, desc }) => (
                              <CardRow key={key} cardKey={key} label={label} desc={desc} checked={cards[key]} onChange={v => setCard(key, v)} />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/5 text-[10px] text-slate-600 text-center flex-shrink-0">
              {activeCount} de {allCards.length} tarjetas activas
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function CardRow({ cardKey, label, desc, checked, onChange }: {
  cardKey: keyof CardPreferences
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-white/5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-sky-500 cursor-pointer flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-slate-300">{label}</div>
        <div className="text-[10px] text-slate-600 truncate">{desc}</div>
      </div>
    </label>
  )
}
