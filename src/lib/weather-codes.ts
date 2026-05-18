export const WMO_CODES: Record<number, { label: string; icon: string; day: string; night: string }> = {
  0:  { label: 'Despejado',              icon: '☀️',  day: 'clear-day',        night: 'clear-night' },
  1:  { label: 'Mayormente despejado',   icon: '🌤️', day: 'partly-cloudy-day', night: 'partly-cloudy-night' },
  2:  { label: 'Parcialmente nublado',   icon: '⛅',  day: 'partly-cloudy-day', night: 'partly-cloudy-night' },
  3:  { label: 'Nublado',                icon: '☁️',  day: 'cloudy',           night: 'cloudy' },
  45: { label: 'Niebla',                 icon: '🌫️', day: 'fog',              night: 'fog' },
  48: { label: 'Niebla con escarcha',    icon: '🌫️', day: 'fog',              night: 'fog' },
  51: { label: 'Llovizna ligera',        icon: '🌦️', day: 'drizzle',          night: 'drizzle' },
  53: { label: 'Llovizna moderada',      icon: '🌦️', day: 'drizzle',          night: 'drizzle' },
  55: { label: 'Llovizna intensa',       icon: '🌧️', day: 'rain',             night: 'rain' },
  61: { label: 'Lluvia ligera',          icon: '🌧️', day: 'rain',             night: 'rain' },
  63: { label: 'Lluvia moderada',        icon: '🌧️', day: 'rain',             night: 'rain' },
  65: { label: 'Lluvia intensa',         icon: '🌧️', day: 'rain',             night: 'rain' },
  71: { label: 'Nieve ligera',           icon: '🌨️', day: 'snow',             night: 'snow' },
  73: { label: 'Nieve moderada',         icon: '❄️',  day: 'snow',             night: 'snow' },
  75: { label: 'Nieve intensa',          icon: '❄️',  day: 'snow',             night: 'snow' },
  80: { label: 'Chubascos ligeros',      icon: '🌦️', day: 'rain',             night: 'rain' },
  81: { label: 'Chubascos moderados',    icon: '🌧️', day: 'rain',             night: 'rain' },
  82: { label: 'Chubascos violentos',    icon: '🌧️', day: 'rain',             night: 'rain' },
  95: { label: 'Tormenta eléctrica',     icon: '⛈️',  day: 'thunderstorm',     night: 'thunderstorm' },
  96: { label: 'Tormenta con granizo',   icon: '⛈️',  day: 'thunderstorm',     night: 'thunderstorm' },
  99: { label: 'Tormenta con granizo',   icon: '⛈️',  day: 'thunderstorm',     night: 'thunderstorm' },
}

export function getWeatherInfo(code: number) {
  return WMO_CODES[code] ?? { label: 'Desconocido', icon: '🌡️', day: 'cloudy', night: 'cloudy' }
}

export function getWindDirection(degrees: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO']
  return dirs[Math.round(degrees / 22.5) % 16]
}

export function getUVLabel(uv: number): { label: string; color: string } {
  if (uv <= 2)  return { label: 'Bajo',       color: 'text-green-500' }
  if (uv <= 5)  return { label: 'Moderado',   color: 'text-yellow-500' }
  if (uv <= 7)  return { label: 'Alto',       color: 'text-orange-500' }
  if (uv <= 10) return { label: 'Muy alto',   color: 'text-red-500' }
  return           { label: 'Extremo',      color: 'text-purple-600' }
}

export function getMoonPhaseLabel(phase: number): { label: string; emoji: string } {
  if (phase < 0.03 || phase > 0.97) return { label: 'Luna nueva',       emoji: '🌑' }
  if (phase < 0.22)                 return { label: 'Luna creciente',   emoji: '🌒' }
  if (phase < 0.28)                 return { label: 'Cuarto creciente', emoji: '🌓' }
  if (phase < 0.47)                 return { label: 'Gibosa creciente', emoji: '🌔' }
  if (phase < 0.53)                 return { label: 'Luna llena',       emoji: '🌕' }
  if (phase < 0.72)                 return { label: 'Gibosa menguante', emoji: '🌖' }
  if (phase < 0.78)                 return { label: 'Cuarto menguante', emoji: '🌗' }
  return                                   { label: 'Luna menguante',   emoji: '🌘' }
}
