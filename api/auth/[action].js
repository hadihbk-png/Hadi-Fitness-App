// /api/auth/signup, /api/auth/login, /api/auth/logout, /api/auth/me
// One file (dynamic route) keeps us well under Vercel's free-plan function limit.
import { one } from '../_lib/db.js'
import { checkPassword, endSession, hashPassword, publicUser, startSession } from '../_lib/auth.js'
import { HttpError, route, toInt } from '../_lib/http.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// Compared against when the email doesn't exist, so both cases take the same time
let dummyHash
const getDummyHash = async () => (dummyHash ??= await hashPassword('pulsefit-timing-dummy-1'))

const normEmail = (e) => (typeof e === 'string' ? e.trim().toLowerCase() : '')

function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length === 0) return 'Please choose a password.'
  if (pw.length < 8) return 'Password must be at least 8 characters.'
  if (pw.length > 72) return 'Password must be 72 characters or fewer.'
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password needs at least one letter and one number.'
  return null
}

function goal(value, fallback, min, max, label) {
  if (value === undefined || value === null || value === '') return fallback
  const n = toInt(value)
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${label} must be between ${min} and ${max}.`, 'invalid_input')
  return n
}

const actions = {
  async signup(req, res) {
    const { fullName, email, password } = req.body
    const name = typeof fullName === 'string' ? fullName.trim() : ''
    const mail = normEmail(email)
    if (!name) throw new HttpError(400, 'Please tell us your name.', 'invalid_input')
    if (name.length > 80) throw new HttpError(400, 'Name must be 80 characters or fewer.', 'invalid_input')
    if (!EMAIL_RE.test(mail)) throw new HttpError(400, 'Please enter a valid email address.', 'invalid_input')
    const pwProblem = passwordProblem(password)
    if (pwProblem) throw new HttpError(400, pwProblem, 'weak_password')
    const workouts = goal(req.body.weeklyGoalWorkouts, 4, 1, 14, 'Weekly workouts goal')
    const minutes = goal(req.body.weeklyGoalMinutes, 150, 10, 3000, 'Weekly minutes goal')

    const user = await one(
      `INSERT INTO users (email, password_hash, full_name, weekly_goal_workouts, weekly_goal_minutes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, full_name, weekly_goal_workouts, weekly_goal_minutes`,
      [mail, await hashPassword(password), name, workouts, minutes]
    )
    if (!user) throw new HttpError(409, 'An account with this email already exists. Try logging in.', 'email_taken')
    await startSession(req, res, user.id)
    res.status(201).json({ user: publicUser(user) })
  },

  async login(req, res) {
    const mail = normEmail(req.body.email)
    const password = typeof req.body.password === 'string' ? req.body.password : ''
    if (!mail || !password) throw new HttpError(400, 'Please enter your email and password.', 'invalid_input')
    const user = await one(
      'SELECT id, email, password_hash, full_name, weekly_goal_workouts, weekly_goal_minutes FROM users WHERE email = $1',
      [mail]
    )
    const ok = await checkPassword(password, user?.password_hash ?? (await getDummyHash()))
    if (!user || !ok) throw new HttpError(401, 'Email or password is incorrect.', 'bad_credentials')
    await startSession(req, res, user.id)
    return { user: publicUser(user) }
  },

  async logout(req, res) {
    endSession(req, res)
    return { ok: true }
  },
}

export default async function handler(req, res) {
  const action = req.query.action
  if (action === 'me') {
    return route({
      GET: (_req, _res, { user }) => {
        if (!user) throw new HttpError(401, 'Not logged in.', 'unauthorized')
        return { user: publicUser(user) }
      },
    })(req, res)
  }
  if (!Object.hasOwn(actions, action)) return res.status(404).json({ error: 'Not found' })
  return route({ POST: actions[action] })(req, res)
}
