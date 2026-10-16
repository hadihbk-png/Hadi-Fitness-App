import { addDays, daysBetween } from './dates.js'

/**
 * Streak = consecutive days with a completed workout.
 * Counts back from today; if today has no workout yet the streak is still alive from yesterday.
 * `dates` = distinct YYYY-MM-DD keys of completed workouts (any order).
 */
export function computeStreak(dates, today) {
  const done = new Set(dates)
  let day = done.has(today) ? today : addDays(today, -1)
  let streak = 0
  while (done.has(day)) {
    streak++
    day = addDays(day, -1)
  }
  return streak
}

export function longestStreak(dates) {
  const sorted = [...new Set(dates)].sort()
  let best = 0
  let run = 0
  sorted.forEach((d, i) => {
    run = i > 0 && daysBetween(sorted[i - 1], d) === 1 ? run + 1 : 1
    best = Math.max(best, run)
  })
  return best
}

// value / goal as a whole percentage for progress rings: always 0–100, never NaN
export const percent = (value, goal) =>
  goal > 0 && Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round((value / goal) * 100))) : 0
