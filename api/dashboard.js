// GET /api/dashboard?today=YYYY-MM-DD — everything the Dashboard shows, for the logged-in user only
import { one, query } from './_lib/db.js'
import { DAY_LABELS, addDays, dayIndex, todayFrom, weekStart } from './_lib/dates.js'
import { route } from './_lib/http.js'
import { computeStreak, longestStreak, percent } from './_lib/stats.js'
import { completedOn, loadOpenWorkout } from './_lib/workouts.js'

export default route(
  {
    async GET(req, _res, { user }) {
      const today = todayFrom(req)
      const monday = weekStart(today)
      const from = [monday, addDays(today, -13)].sort()[0]

      const [workout, completedToday, perDay, dates, totals, recent] = await Promise.all([
        loadOpenWorkout(user.id, today),
        completedOn(user.id, today),
        query(
          `SELECT to_char(workout_date, 'YYYY-MM-DD') AS day, count(*)::int AS workouts,
                  COALESCE(sum(duration_minutes), 0)::int AS minutes
             FROM workouts
            WHERE user_id = $1 AND status = 'completed' AND workout_date BETWEEN $2 AND $3
            GROUP BY workout_date`,
          [user.id, from, today]
        ),
        query(
          `SELECT DISTINCT to_char(workout_date, 'YYYY-MM-DD') AS day FROM workouts
            WHERE user_id = $1 AND status = 'completed' AND workout_date <= $2`,
          [user.id, today]
        ),
        one(
          `SELECT count(*)::int AS workouts,
                  COALESCE(sum(duration_minutes), 0)::int AS minutes,
                  count(*) FILTER (WHERE EXISTS (
                    SELECT 1 FROM workout_exercises we JOIN exercises e ON e.id = we.exercise_id
                     WHERE we.workout_id = w.id AND e.muscle_group = 'Cardio'))::int AS cardio_workouts,
                  (SELECT count(*) FROM workout_sets s JOIN workout_exercises we ON we.id = s.workout_exercise_id
                     JOIN workouts w2 ON w2.id = we.workout_id
                    WHERE w2.user_id = $1 AND w2.status = 'completed' AND s.completed)::int AS sets
             FROM workouts w WHERE w.user_id = $1 AND w.status = 'completed'`,
          [user.id]
        ),
        query(
          `SELECT w.id, w.name, to_char(w.workout_date, 'YYYY-MM-DD') AS day, w.duration_minutes,
                  (SELECT count(*) FROM workout_sets s JOIN workout_exercises we ON we.id = s.workout_exercise_id
                    WHERE we.workout_id = w.id AND s.completed)::int AS sets
             FROM workouts w
            WHERE w.user_id = $1 AND w.status = 'completed'
            ORDER BY w.workout_date DESC, w.completed_at DESC
            LIMIT 4`,
          [user.id]
        ),
      ])

      const byDay = new Map(perDay.map((r) => [r.day, r]))
      const minutesOn = (d) => byDay.get(d)?.minutes ?? 0

      // Weekly activity chart: last 7 days, oldest first
      const chartDays = Array.from({ length: 7 }, (_, k) => {
        const date = addDays(today, k - 6)
        return { date, label: k === 6 ? 'Today' : DAY_LABELS[dayIndex(date)], minutes: minutesOn(date) }
      })
      const chartTotal = chartDays.reduce((n, d) => n + d.minutes, 0)
      const previousTotal = Array.from({ length: 7 }, (_, k) => minutesOn(addDays(today, k - 13))).reduce((a, b) => a + b, 0)

      // This calendar week (Mon–Sun)
      const weekDays = DAY_LABELS.map((label, i) => {
        const date = addDays(monday, i)
        return { label, date, done: byDay.has(date), isToday: date === today }
      })
      const weekRows = perDay.filter((r) => r.day >= monday)
      const weekWorkouts = weekRows.reduce((n, r) => n + r.workouts, 0)
      const weekMinutes = weekRows.reduce((n, r) => n + r.minutes, 0)
      const goalsHit =
        (weekWorkouts >= user.weekly_goal_workouts ? 1 : 0) + (weekMinutes >= user.weekly_goal_minutes ? 1 : 0)

      const doneDates = dates.map((r) => r.day)

      return {
        user: {
          fullName: user.full_name,
          weeklyGoalWorkouts: user.weekly_goal_workouts,
          weeklyGoalMinutes: user.weekly_goal_minutes,
        },
        today,
        workout,
        completedToday,
        week: {
          workouts: weekWorkouts,
          minutes: weekMinutes,
          goalWorkouts: user.weekly_goal_workouts,
          goalMinutes: user.weekly_goal_minutes,
          workoutsPct: percent(weekWorkouts, user.weekly_goal_workouts),
          minutesPct: percent(weekMinutes, user.weekly_goal_minutes),
          goalsHit,
          goalsTotal: 2,
          days: weekDays,
        },
        chart: {
          days: chartDays,
          total: chartTotal,
          previousTotal,
          changePct: previousTotal > 0 ? Math.round(((chartTotal - previousTotal) / previousTotal) * 100) : null,
        },
        streak: { current: computeStreak(doneDates, today), longest: longestStreak(doneDates) },
        totals: {
          workouts: totals.workouts,
          minutes: totals.minutes,
          cardioWorkouts: totals.cardio_workouts,
          sets: totals.sets,
        },
        recent: recent.map((r) => ({ id: r.id, name: r.name, date: r.day, minutes: r.duration_minutes, sets: r.sets })),
      }
    },
  },
  { auth: true }
)
