// GET  /api/workouts?today=YYYY-MM-DD   — today's open workout with exercises + sets
// POST /api/workouts { action, ... }
//   add      { exerciseId, today }  add an exercise to today's workout (creates the workout if needed)
//   remove   { workoutExerciseId }   take an exercise out again
//   start    { workoutId }           Live Workout started
//   complete { workoutId, durationMinutes }
// Every statement is scoped to the logged-in user's own workouts.
import { one, query } from './_lib/db.js'
import { todayFrom } from './_lib/dates.js'
import { HttpError, requireInt, route } from './_lib/http.js'
import { completedOn, loadOpenWorkout, renameFromExercises } from './_lib/workouts.js'

async function todayPayload(userId, today) {
  const [workout, done] = await Promise.all([loadOpenWorkout(userId, today), completedOn(userId, today)])
  return { workout, completedToday: done }
}

const actions = {
  async add(req, userId) {
    const today = todayFrom(req)
    const exerciseId = requireInt(req.body.exerciseId, 'Exercise')
    const exercise = await one('SELECT id, name FROM exercises WHERE id = $1', [exerciseId])
    if (!exercise) throw new HttpError(404, 'That exercise no longer exists.', 'not_found')

    await query(
      `INSERT INTO workouts (user_id, name, workout_date) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, workout_date) WHERE status <> 'completed' DO NOTHING`,
      [userId, "Today's Workout", today]
    )
    const workout = await one(
      `SELECT id FROM workouts WHERE user_id = $1 AND workout_date = $2 AND status <> 'completed'`,
      [userId, today]
    )
    // Add the exercise and all of its sets in one statement
    const inserted = await query(
      `WITH we AS (
         INSERT INTO workout_exercises (workout_id, exercise_id, order_index)
         SELECT $1, $2, COALESCE((SELECT max(order_index) + 1 FROM workout_exercises WHERE workout_id = $1), 0)
         ON CONFLICT (workout_id, exercise_id) DO NOTHING
         RETURNING id, exercise_id
       )
       INSERT INTO workout_sets (workout_exercise_id, set_number)
       SELECT we.id, n FROM we JOIN exercises e ON e.id = we.exercise_id, generate_series(1, e.sets) AS n
       RETURNING id`,
      [workout.id, exerciseId]
    )
    if (inserted.length) await renameFromExercises(workout.id)
    return {
      added: inserted.length > 0,
      message: inserted.length ? `Added ${exercise.name} to today's workout` : `${exercise.name} is already in today's workout`,
      ...(await todayPayload(userId, today)),
    }
  },

  async remove(req, userId) {
    const today = todayFrom(req)
    const id = requireInt(req.body.workoutExerciseId, 'Exercise')
    const removed = await one(
      `DELETE FROM workout_exercises we USING workouts w
        WHERE we.id = $1 AND we.workout_id = w.id AND w.user_id = $2 AND w.status <> 'completed'
        RETURNING we.workout_id`,
      [id, userId]
    )
    if (!removed) throw new HttpError(404, 'That exercise is not in your workout.', 'not_found')
    // Drop a planned workout that is now empty; otherwise keep its name in sync
    const gone = await one(
      `DELETE FROM workouts w WHERE w.id = $1 AND w.status = 'planned'
          AND NOT EXISTS (SELECT 1 FROM workout_exercises WHERE workout_id = w.id) RETURNING id`,
      [removed.workout_id]
    )
    if (!gone) await renameFromExercises(removed.workout_id)
    return { message: 'Removed from today’s workout', ...(await todayPayload(userId, today)) }
  },

  async start(req, userId) {
    const workoutId = requireInt(req.body.workoutId, 'Workout')
    const row = await one(
      `UPDATE workouts SET status = 'in_progress', started_at = COALESCE(started_at, now())
        WHERE id = $1 AND user_id = $2 AND status <> 'completed'
          AND EXISTS (SELECT 1 FROM workout_exercises WHERE workout_id = $1)
        RETURNING id, started_at`,
      [workoutId, userId]
    )
    if (!row) throw new HttpError(404, 'No workout to start. Add some exercises first.', 'not_found')
    return { id: row.id, status: 'in_progress', startedAt: new Date(row.started_at).toISOString() }
  },

  async complete(req, userId) {
    const workoutId = requireInt(req.body.workoutId, 'Workout')
    const minutes = Math.min(600, Math.max(1, Math.round(Number(req.body.durationMinutes) || 1)))
    const row = await one(
      `UPDATE workouts
          SET status = 'completed', completed_at = now(), started_at = COALESCE(started_at, now()), duration_minutes = $3
        WHERE id = $1 AND user_id = $2 AND status <> 'completed'
        RETURNING id, name, duration_minutes`,
      [workoutId, userId, minutes]
    )
    if (!row) throw new HttpError(404, 'That workout was not found or is already finished.', 'not_found')
    const sets = await one(
      `SELECT count(*) FILTER (WHERE s.completed)::int AS done, count(*)::int AS total
         FROM workout_sets s JOIN workout_exercises we ON we.id = s.workout_exercise_id WHERE we.workout_id = $1`,
      [workoutId]
    )
    return { id: row.id, name: row.name, status: 'completed', durationMinutes: row.duration_minutes, sets }
  },
}

export default route(
  {
    async GET(req, _res, { user }) {
      return todayPayload(user.id, todayFrom(req))
    },
    async POST(req, _res, { user }) {
      const action = req.body.action
      if (!Object.hasOwn(actions, action)) throw new HttpError(400, 'Unknown action.', 'invalid_input')
      return actions[action](req, user.id)
    },
  },
  { auth: true }
)
