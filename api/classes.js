// GET  /api/classes            — this week's classes (public; includes your bookings when logged in)
// POST /api/classes {classId}  — book / cancel a spot this week (login required)
import { one, query } from './_lib/db.js'
import { HttpError, requireInt, route } from './_lib/http.js'

// Classes repeat weekly: show each on the same weekday + time within the current week.
const THIS_WEEK = `date_trunc('week', LOCALTIMESTAMP)`

export default route({
  async GET(_req, _res, { user }) {
    const rows = await query(
      `SELECT c.id, c.title, c.category, c.coach_name, c.room, c.duration_minutes, c.capacity, c.intensity,
              to_char(${THIS_WEEK} + (c.start_time - date_trunc('week', c.start_time)), 'YYYY-MM-DD"T"HH24:MI') AS starts_at,
              to_char(${THIS_WEEK}, 'YYYY-MM-DD') AS week_start,
              (SELECT count(*) FROM class_bookings b
                WHERE b.class_id = c.id AND b.week_start = ${THIS_WEEK}::date AND NOT b.waitlisted)::int AS booked,
              (SELECT CASE WHEN b.waitlisted THEN 'waitlisted' ELSE 'booked' END FROM class_bookings b
                WHERE b.class_id = c.id AND b.week_start = ${THIS_WEEK}::date AND b.user_id = $1) AS my_booking
         FROM classes c
        ORDER BY starts_at`,
      [user?.id ?? null]
    )
    return {
      weekStart: rows[0]?.week_start ?? null,
      classes: rows.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        coach: c.coach_name,
        room: c.room,
        startsAt: c.starts_at,
        duration: c.duration_minutes,
        capacity: c.capacity,
        intensity: c.intensity,
        spotsLeft: Math.max(0, c.capacity - c.booked),
        myBooking: c.my_booking,
      })),
    }
  },

  async POST(req, _res, { user }) {
    if (!user) throw new HttpError(401, 'Log in to book a class.', 'unauthorized')
    const classId = requireInt(req.body.classId, 'Class')
    const cls = await one(
      `SELECT c.id, c.title, c.capacity,
              (SELECT count(*) FROM class_bookings b
                WHERE b.class_id = c.id AND b.week_start = ${THIS_WEEK}::date AND NOT b.waitlisted)::int AS booked
         FROM classes c WHERE c.id = $1`,
      [classId]
    )
    if (!cls) throw new HttpError(404, 'That class no longer exists.', 'not_found')

    const cancelled = await one(
      `DELETE FROM class_bookings WHERE user_id = $1 AND class_id = $2 AND week_start = ${THIS_WEEK}::date RETURNING class_id`,
      [user.id, classId]
    )
    if (cancelled) return { booked: false, status: null, message: `Cancelled ${cls.title}` }

    const waitlisted = cls.booked >= cls.capacity
    await query(
      `INSERT INTO class_bookings (user_id, class_id, week_start, waitlisted)
       VALUES ($1, $2, ${THIS_WEEK}::date, $3) ON CONFLICT DO NOTHING`,
      [user.id, classId, waitlisted]
    )
    return {
      booked: true,
      status: waitlisted ? 'waitlisted' : 'booked',
      message: waitlisted ? `You're on the waitlist for ${cls.title}` : `Booked ${cls.title}`,
    }
  },
})
