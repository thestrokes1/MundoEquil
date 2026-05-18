'use client'
import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Settings, X, RotateCcw } from 'lucide-react'
import { useNavStore, TimeView } from '@/stores/nav-store'
import { usePreferencesStore } from '@/stores/preferences-store'
import { ELEMENTS } from '@/lib/card-categories'

const TIME_TABS: { id: TimeView; label: string }[] = [
  { id: 'today',   label: 'Hoy'         },
  { id: 'week',    label: 'Esta semana' },
  { id: 'history', label: 'Histórico'   },
]

export function DashboardNav() {
  const {
    timeView, activeElement, activeSubcategory, settingsSubcategory,
    setTimeView, toggleElement, toggleSubcategory, setSettingsSubcategory,
  } = useNavStore()
  const { cards, setCard, resetCards } = usePreferencesStore()

  const pillsRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false })

  const currentElement = activeElement ? ELEMENTS.find(e => e.id === activeElement) ?? null : null
  const settingsSub = settingsSubcategory
    ? ELEMENTS.flatMap(e => e.subcategories).find(s => s.name === settingsSubcategory) ?? null
    : null

  // Escape closes popover
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setSettingsSubcategory(null) }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [setSettingsSubcategory])

  // Drag-to-scroll on subcategory pills
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = pillsRef.current
    if (!el) return
    drag.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft, moved: false }
    el.style.cursor = 'grabbing'
    el.style.userSelect = 'none'
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!drag.current.active || !pillsRef.current) return
    const x = e.pageX - pillsRef.current.offsetLeft
    const delta = x - drag.current.startX
    if (Math.abs(delta) > 4) drag.current.moved = true
    pillsRef.current.scrollLeft = drag.current.scrollLeft - delta
  }, [])

  const stopDrag = useCallback(() => {
    const el = pillsRef.current
    if (!el) return
    drag.current.active = false
    el.style.cursor = ''
    el.style.userSelect = ''
    setTimeout(() => { drag.current.moved = false }, 0)
  }, [])

  return (
    <>
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-white/5 shadow-lg">

        {/* ── Row 1: Time tabs + reset ── */}
        <div className="max-w-7xl mx-auto px-4 pt-3 pb-2 flex items-center gap-1.5">
          {TIME_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTimeView(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                timeView === tab.id
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={resetCards}
            title="Restablecer todas las tarjetas"
            className="ml-auto p-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Row 2: Element tabs ── */}
        <div className="max-w-7xl mx-auto px-4 pb-2 flex gap-1.5">
          <button
            onClick={() => activeElement && toggleElement(activeElement)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all border ${
              !activeElement
                ? 'bg-white/12 text-white border-white/20'
                : 'bg-white/4 text-slate-500 border-white/5 hover:text-slate-300 hover:bg-white/8'
            }`}
          >
            Todas
          </button>

          {ELEMENTS.map(el => {
            const totalInEl = el.subcategories.reduce((a, s) => a + s.cards.length, 0)
            const activeInEl = el.subcategories.reduce(
              (a, s) => a + s.cards.filter(c => cards[c.key]).length, 0
            )
            const isActive = activeElement === el.id
            const hasHidden = activeInEl < totalInEl

            return (
              <button
                key={el.id}
                onClick={() => toggleElement(el.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all border ${
                  isActive
                    ? 'text-white border-white/25 shadow-sm'
                    : 'bg-white/4 text-slate-400 border-white/5 hover:text-slate-200 hover:bg-white/8'
                }`}
                style={isActive ? {
                  background: elementColor(el.id, 0.18),
                  borderColor: elementColor(el.id, 0.4),
                } : {}}
              >
                <span className="text-base leading-none">{el.icon}</span>
                <span className="hidden sm:inline">{el.name}</span>
                {hasHidden && (
                  <span className="text-[8px] text-amber-500 font-bold tabular-nums">
                    {activeInEl}/{totalInEl}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Row 3: Subcategory pills (only when element selected) ── */}
        {currentElement && (
          <div
            ref={pillsRef}
            className="max-w-7xl mx-auto px-4 pb-3 flex gap-1.5 overflow-x-auto"
            style={{ scrollbarWidth: 'none', cursor: 'grab' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
          >
            {currentElement.subcategories.map(sub => {
              const total = sub.cards.length
              const active = sub.cards.filter(c => cards[c.key]).length
              const isActive = activeSubcategory === sub.name
              const hasSettings = settingsSubcategory === sub.name
              const hasHidden = active < total

              return (
                <div key={sub.name} className="flex-shrink-0 flex">
                  <button
                    onClick={() => { if (drag.current.moved) return; toggleSubcategory(sub.name) }}
                    className={`flex items-center gap-1.5 pl-3 pr-2 py-1.5 text-xs font-medium rounded-l-xl border transition-all ${
                      isActive
                        ? 'bg-white/15 text-white border-white/25'
                        : 'bg-white/5 text-slate-400 border-white/8 hover:text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <span className="max-w-[100px] truncate">{sub.name}</span>
                    {hasHidden && (
                      <span className="text-[8px] text-amber-500 font-bold">{active}/{total}</span>
                    )}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); if (drag.current.moved) return; setSettingsSubcategory(hasSettings ? null : sub.name) }}
                    className={`flex-shrink-0 flex items-center justify-center w-7 rounded-r-xl border border-l-0 transition-all ${
                      isActive ? 'bg-white/15 border-white/25' : 'bg-white/5 border-white/8 hover:bg-white/10'
                    } ${hasSettings ? 'text-sky-400' : 'text-slate-600 hover:text-slate-400'}`}
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Settings popover ── */}
      {settingsSub && createPortal(
        <div className="fixed inset-0 z-50" onClick={() => setSettingsSubcategory(null)}>
          <div
            className="absolute top-32 left-1/2 -translate-x-1/2 w-72 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/3">
              <span className="text-sm font-semibold text-slate-200">{settingsSub.name}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const allOn = settingsSub.cards.every(c => cards[c.key])
                    settingsSub.cards.forEach(c => setCard(c.key, !allOn))
                  }}
                  className="text-[9px] px-2 py-1 rounded-lg border border-white/10 text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                >
                  {settingsSub.cards.every(c => cards[c.key]) ? 'Ocultar todo' : 'Mostrar todo'}
                </button>
                <button onClick={() => setSettingsSubcategory(null)} className="p-1 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {settingsSub.cards.map(({ key, label, desc }) => {
                const on = cards[key]
                return (
                  <label key={key} className="flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-white/5 cursor-pointer">
                    <div
                      onClick={() => setCard(key, !on)}
                      className={`flex-shrink-0 rounded-full relative transition-colors ${on ? 'bg-sky-500' : 'bg-white/10'}`}
                      style={{ width: 32, height: 18 }}
                    >
                      <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${on ? 'left-[14px]' : 'left-0.5'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium truncate ${on ? 'text-slate-200' : 'text-slate-500'}`}>{label}</div>
                      <div className="text-[9px] text-slate-600 truncate">{desc}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function elementColor(id: string, alpha: number): string {
  const colors: Record<string, string> = {
    aire:    `rgba(147,197,253,${alpha})`,  // sky blue
    agua:    `rgba(96,165,250,${alpha})`,   // blue
    tierra:  `rgba(134,239,172,${alpha})`,  // green
    cielo:   `rgba(253,224,71,${alpha})`,   // yellow
    general: `rgba(167,139,250,${alpha})`,  // violet
  }
  return colors[id] ?? `rgba(255,255,255,${alpha})`
}
