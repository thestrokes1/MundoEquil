'use client'
import { useState, useEffect } from 'react'
import { timeSince } from '@/lib/utils'

interface Props {
  updatedAt: string
  refetching?: boolean
}

export function DataFreshness({ updatedAt, refetching }: Props) {
  const [label, setLabel] = useState(timeSince(updatedAt))

  useEffect(() => {
    const id = setInterval(() => setLabel(timeSince(updatedAt)), 10_000)
    return () => clearInterval(id)
  }, [updatedAt])

  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500">
      <span
        className={`w-1.5 h-1.5 rounded-full ${refetching ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'}`}
      />
      {refetching ? 'Actualizando...' : `Actualizado ${label}`}
    </div>
  )
}
