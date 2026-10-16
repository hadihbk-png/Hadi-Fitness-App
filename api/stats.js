// GET /api/stats — public numbers for the landing page counters
import { one } from './_lib/db.js'
import { route } from './_lib/http.js'

export default route({
  async GET() {
    const row = await one(`
      SELECT (SELECT count(*) FROM users)::int                                   AS members,
             (SELECT count(*) FROM workouts WHERE status = 'completed')::int    AS workouts_completed,
             (SELECT count(*) FROM classes)::int                                AS classes_this_week`)
    return {
      members: row.members,
      workoutsCompleted: row.workouts_completed,
      classesThisWeek: row.classes_this_week,
    }
  },
})
