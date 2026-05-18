import { NextResponse } from 'next/server'

export interface APODData {
  title: string
  date: string
  explanation: string
  url: string
  hdurl?: string
  mediaType: 'image' | 'video'
  copyright?: string
}

export async function GET() {
  const apiKey = process.env.NASA_API_KEY ?? 'DEMO_KEY'
  const url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}&thumbs=true`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ error: 'Error al obtener APOD' }, { status: 502 })

  const raw = await res.json()
  const isVideo = raw.media_type === 'video'
  const imageUrl = isVideo
    ? (raw.thumbnail_url ?? '')
    : (raw.url ?? '')

  const data: APODData = {
    title: raw.title ?? 'Foto astronómica del día',
    date: raw.date ?? '',
    explanation: raw.explanation ?? '',
    url: imageUrl,
    hdurl: raw.hdurl,
    mediaType: raw.media_type ?? 'image',
    copyright: raw.copyright,
  }

  return NextResponse.json(data)
}
