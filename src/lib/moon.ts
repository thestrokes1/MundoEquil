export function getMoonPhase(date: Date = new Date()): number {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  let y = year
  let m = month
  if (m < 3) { y -= 1; m += 12 }

  const a = Math.floor(y / 100)
  const b = 2 - a + Math.floor(a / 4)
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5

  const daysSinceNew = (jd - 2451549.5) % 29.53058853
  const normalized = daysSinceNew < 0 ? daysSinceNew + 29.53058853 : daysSinceNew

  return normalized / 29.53058853
}
