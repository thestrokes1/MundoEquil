import { NextResponse } from 'next/server'

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="100" fill="#0f172a"/>
  <circle cx="256" cy="220" r="120" fill="none" stroke="#38bdf8" stroke-width="12" opacity="0.25"/>
  <circle cx="256" cy="220" r="80" fill="none" stroke="#38bdf8" stroke-width="10" opacity="0.4"/>
  <circle cx="256" cy="220" r="45" fill="#38bdf8" opacity="0.85"/>
  <text x="256" y="390" text-anchor="middle" font-family="sans-serif" font-size="44" font-weight="bold" fill="#38bdf8">MundoEquil</text>
  <text x="256" y="440" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#64748b">Panel Ambiental</text>
</svg>`

export async function GET() {
  return new NextResponse(SVG, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' },
  })
}
