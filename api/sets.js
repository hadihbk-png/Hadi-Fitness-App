// PATCH /api/sets { setId, completed } — tick / untick a set in your own, unfinished workout
import { one } from './_lib/db.js'
import { HttpError, requireInt, route } from './_lib/http.js'

async function update(req, _res, { user }) {
  const setId = requireInt(req.body.setId, 'Set')
  if (typeof req.body.completed !== 'boolean') throw new HttpError(400, 'completed must be true or false.', 'invalid_input')
  const row = await one(
    `UPDATE workout_sets s
        SET completed = $2, completed_at = CASE WHEN $2 THEN now() ELSE NULL END
       FROM workout_exercises we, workouts w
      WHERE s.id = $1 AND s.workout_exercise_id = we.id AND we.workout_id = w.id
        AND w.user_id = $3 AND w.status <> 'completed'
      RETURNING s.id, s.completed`,
    [setId, req.body.completed, user.id]
  )
  if (!row) throw new HttpError(404, 'That set was not found.', 'not_found')
  return { id: row.id, completed: row.completed }
}

export default route({ PATCH: update, POST: update }, { auth: true })
