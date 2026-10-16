import { HttpError } from './http.js'

// All "day" maths uses YYYY-MM-DD keys in the user's local calendar (sent by the browser),
// so a workout at 11pm counts for the right day whatever timezone the server runs in.
const DAY_MS = 86_400_000
export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const toUtc = (key) => new Date(`${key}T00:00:00Z`)
const toKey = (d) => d.toISOString().slice(0, 10)

export const isDateKey = (s) =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toUtc(s).getTime()) && toKey(toUtc(s)) === s
export const addDays = (key, n) => toKey(new Date(toUtc(key).getTime() + n * DAY_MS))
export const dayIndex = (key) => (toUtc(key).getUTCDay() + 6) % 7 // Monday = 0
export const weekStart = (key) => addDays(key, -dayIndex(key))
export const daysBetween = (a, b) => Math.round((toUtc(b) - toUtc(a)) / DAY_MS)

// The browser's "today". Must be within 2 days of the server clock (covers every timezone).
export function todayFrom(req) {
  const value = req.query?.today ?? req.body?.today
  const serverToday = toKey(new Date())
  if (value == null) return serverToday
  if (!isDateKey(value) || Math.abs(daysBetween(serverToday, value)) > 2) {
    throw new HttpError(400, 'Invalid date.', 'invalid_date')
  }
  return value
}
