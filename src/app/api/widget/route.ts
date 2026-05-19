import { NextRequest, NextResponse } from 'next/server'

function escXml(s: string | number): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const name = searchParams.get('name') ?? 'Mi ubicación'
  const country = searchParams.get('country') ?? ''

  if (!lat || !lon) {
    return new NextResponse('lat y lon requeridos', { status: 400 })
  }

  // Fetch weather from our own route
  const baseUrl = req.nextUrl.origin
  let temp = '—'
  let condition = '—'
  let humidity = '—'
  let wind = '—'
  let icon = '🌤'

  try {
    const res = await fetch(`${baseUrl}/api/weather?lat=${lat}&lon=${lon}`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      const c = data.current
      temp = `${Math.round(c.temperature)}°C`
      condition = c.description ?? '—'
      humidity = `${c.humidity}%`
      wind = `${Math.round(c.windSpeed)} km/h`
      icon = c.isDaytime ? '☀️' : '🌙'
      if (c.weatherCode >= 61) icon = '🌧'
      else if (c.weatherCode >= 51) icon = '🌦'
      else if (c.weatherCode >= 1) icon = '⛅'
    }
  } catch {
    // silent fallback
  }

  const locationStr = country ? `${escXml(name)}, ${escXml(country)}` : escXml(name)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="96" viewBox="0 0 320 96">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="320" height="96" rx="16" fill="url(#bg)"/>
  <rect width="320" height="96" rx="16" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

  <!-- Icon -->
  <text x="20" y="56" font-size="32" font-family="system-ui">${icon}</text>

  <!-- Temp -->
  <text x="72" y="46" font-size="28" font-weight="700" fill="white" font-family="system-ui,-apple-system,sans-serif">${escXml(temp)}</text>

  <!-- Condition -->
  <text x="72" y="64" font-size="11" fill="#94a3b8" font-family="system-ui,-apple-system,sans-serif">${escXml(condition)}</text>

  <!-- Location -->
  <text x="20" y="84" font-size="10" fill="#64748b" font-family="system-ui,-apple-system,sans-serif">${locationStr}</text>

  <!-- Stats -->
  <text x="220" y="38" font-size="10" fill="#64748b" font-family="system-ui,-apple-system,sans-serif">Humedad</text>
  <text x="220" y="52" font-size="13" font-weight="600" fill="#7dd3fc" font-family="system-ui,-apple-system,sans-serif">${escXml(humidity)}</text>

  <text x="220" y="68" font-size="10" fill="#64748b" font-family="system-ui,-apple-system,sans-serif">Viento</text>
  <text x="220" y="82" font-size="13" font-weight="600" fill="#86efac" font-family="system-ui,-apple-system,sans-serif">${escXml(wind)}</text>

  <!-- Branding -->
  <text x="300" y="14" font-size="9" fill="#334155" font-family="system-ui,-apple-system,sans-serif" text-anchor="end">MundoEquil</text>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
    },
  })
}
