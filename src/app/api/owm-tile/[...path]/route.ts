import { NextRequest, NextResponse } from 'next/server'

const ALLOWED = new Set(['wind_new', 'clouds_new', 'precipitation_new', 'pressure_new', 'temp_new'])

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const [layer, z, x, y] = path
  const key = process.env.OPENWEATHERMAP_API_KEY

  if (!key || !ALLOWED.has(layer) || !z || !x || !y) {
    return new NextResponse(null, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${key}`,
      { next: { revalidate: 600 } }
    )
    if (!res.ok) return new NextResponse(null, { status: res.status })

    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=600',
      },
    })
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}
