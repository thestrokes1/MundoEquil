import { NextResponse } from 'next/server'

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <rect width="192" height="192" rx="40" fill="#0f172a"/>
  <circle cx="96" cy="96" r="60" fill="none" stroke="#38bdf8" stroke-width="6" opacity="0.3"/>
  <circle cx="96" cy="96" r="40" fill="none" stroke="#38bdf8" stroke-width="4" opacity="0.5"/>
  <circle cx="96" cy="96" r="20" fill="#38bdf8" opacity="0.8"/>
  <text x="96" y="160" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="bold" fill="#38bdf8">MundoEquil</text>
</svg>`

export async function GET() {
  return new NextResponse(SVG, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' },
  })
}
