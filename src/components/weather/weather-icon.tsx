import { cn } from '@/lib/utils'

const ICONS: Record<string, string> = {
  'clear-day':            '☀️',
  'clear-night':          '🌙',
  'partly-cloudy-day':    '⛅',
  'partly-cloudy-night':  '🌤️',
  'cloudy':               '☁️',
  'fog':                  '🌫️',
  'drizzle':              '🌦️',
  'rain':                 '🌧️',
  'snow':                 '❄️',
  'thunderstorm':         '⛈️',
}

interface Props {
  icon: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = { sm: 'text-3xl', md: 'text-5xl', lg: 'text-7xl', xl: 'text-9xl' }

export function WeatherIcon({ icon, size = 'md', className }: Props) {
  return (
    <span
      className={cn('select-none leading-none', sizes[size], className)}
      role="img"
      aria-label={icon}
    >
      {ICONS[icon] ?? '🌡️'}
    </span>
  )
}
