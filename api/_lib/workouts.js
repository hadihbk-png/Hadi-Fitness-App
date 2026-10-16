import { one, query } from './db.js'

export const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Arms', 'Core', 'Cardio']

// The user's open (planned / in progress) workout for a given day, with exercises and sets.
// Every query is scoped by user_id so one user can never load another user's workout.
export async function loadOpenWorkout(userId, day) {
  const workout = await one(
    `SELECT id, name, status, to_char(workout_date, 'YYYY-MM-DD') AS workout_date, started_at
       FROM workouts
      WHERE user_id = $1 AND workout_date = $2 AND status <> 'completed'
      LIMIT 1`,
    [userId, day]
  )
  if (!workout) return null
  const exercises = await query(
    `SELECT we.id, we.exercise_id, we.order_index,
            e.name, e.muscle_group, e.reps, e.difficulty, e.rest_seconds, e.description,
            COALESCE(
              json_agg(json_build_object('id', s.id, 'setNumber', s.set_number, 'completed', s.completed)
                       ORDER BY s.set_number) FILTER (WHERE s.id IS NOT NULL),
              '[]'
            ) AS sets
       FROM workout_exercises we
       JOIN exercises e ON e.id = we.exercise_id
       LEFT JOIN workout_sets s ON s.workout_exercise_id = we.id
      WHERE we.workout_id = $1
      GROUP BY we.id, e.id
      ORDER BY we.order_index, we.id`,
    [workout.id]
  )
  return {
    id: workout.id,
    name: workout.name,
    status: workout.status,
    date: workout.workout_date,
    startedAt: workout.started_at ? new Date(workout.started_at).toISOString() : null,
    exercises: exercises.map((x) => ({
      id: x.id,
      exerciseId: x.exercise_id,
      name: x.name,
      muscleGroup: x.muscle_group,
      reps: x.reps,
      difficulty: x.difficulty,
      restSeconds: x.rest_seconds,
      description: x.description,
      sets: typeof x.sets === 'string' ? JSON.parse(x.sets) : x.sets,
    })),
  }
}

export async function completedOn(userId, day) {
  return one(
    `SELECT count(*)::int AS count, COALESCE(sum(duration_minutes), 0)::int AS minutes
       FROM workouts WHERE user_id = $1 AND workout_date = $2 AND status = 'completed'`,
    [userId, day]
  )
}

// "Chest Day", "Chest & Arms", "Full Body" — named after the muscle groups it contains.
export function workoutName(groups) {
  const unique = MUSCLE_GROUPS.filter((g) => groups.includes(g))
  if (unique.length === 0) return "Today's Workout"
  if (unique.length === 1) return unique[0] === 'Cardio' ? 'Cardio Burn' : `${unique[0]} Day`
  if (unique.length === 2) return `${unique[0]} & ${unique[1]}`
  return 'Full Body'
}

export async function renameFromExercises(workoutId) {
  const rows = await query(
    `SELECT DISTINCT e.muscle_group FROM workout_exercises we JOIN exercises e ON e.id = we.exercise_id
      WHERE we.workout_id = $1`,
    [workoutId]
  )
  await query('UPDATE workouts SET name = $2 WHERE id = $1', [workoutId, workoutName(rows.map((r) => r.muscle_group))])
}
