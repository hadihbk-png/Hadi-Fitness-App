// GET /api/exercises[?muscle=Chest] — the workout library (login required)
import { query } from './_lib/db.js'
import { HttpError, route } from './_lib/http.js'
import { MUSCLE_GROUPS } from './_lib/workouts.js'

export default route(
  {
    async GET(req) {
      const muscle = req.query.muscle
      if (muscle && muscle !== 'All' && !MUSCLE_GROUPS.includes(muscle)) {
        throw new HttpError(400, 'Unknown muscle group.', 'invalid_input')
      }
      const rows = await query(
        `SELECT id, name, muscle_group, sets, reps, difficulty, rest_seconds, description
           FROM exercises
          WHERE ($1::text IS NULL OR muscle_group = $1)
          ORDER BY array_position(ARRAY['Chest','Back','Legs','Arms','Core','Cardio'], muscle_group),
                   array_position(ARRAY['Beginner','Intermediate','Advanced'], difficulty), name`,
        [muscle && muscle !== 'All' ? muscle : null]
      )
      return {
        exercises: rows.map((r) => ({
          id: r.id,
          name: r.name,
          muscleGroup: r.muscle_group,
          sets: r.sets,
          reps: r.reps,
          difficulty: r.difficulty,
          restSeconds: r.rest_seconds,
          description: r.description,
        })),
      }
    },
  },
  { auth: true }
)
