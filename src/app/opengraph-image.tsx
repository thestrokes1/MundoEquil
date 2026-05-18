import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'MundoEquil — Panel Ambiental en Tiempo Real'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Decorative rings */}
        <div style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          border: '1px solid rgba(56,189,248,0.1)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute',
          width: 350,
          height: 350,
          borderRadius: '50%',
          border: '1px solid rgba(56,189,248,0.15)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          display: 'flex',
        }} />

        {/* Globe */}
        <div style={{ fontSize: 100, marginBottom: 24, display: 'flex' }}>🌍</div>

        {/* Title */}
        <div style={{
          fontSize: 80,
          fontWeight: 800,
          color: '#f1f5f9',
          letterSpacing: '-3px',
          lineHeight: 1,
          display: 'flex',
        }}>
          MundoEquil
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 30,
          color: '#38bdf8',
          marginTop: 20,
          letterSpacing: '0.5px',
          display: 'flex',
        }}>
          Panel Ambiental en Tiempo Real
        </div>

        {/* Feature pills */}
        <div style={{
          display: 'flex',
          gap: 16,
          marginTop: 44,
        }}>
          {['🌤️ Clima', '💨 Calidad del Aire', '🌙 Astronomía', '🌋 Sismos'].map((f) => (
            <div key={f} style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: '10px 20px',
              color: '#94a3b8',
              fontSize: 20,
              display: 'flex',
            }}>
              {f}
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{
          position: 'absolute',
          bottom: 36,
          color: '#334155',
          fontSize: 18,
          display: 'flex',
        }}>
          mundoequil.vercel.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
