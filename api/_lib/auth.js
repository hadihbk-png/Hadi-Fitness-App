import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { one } from './db.js'

export const COOKIE_NAME = 'pf_session'
// Non-secret hint readable by the page, so logged-out visitors skip the /api/auth/me check
export const HINT_COOKIE = 'pf_logged_in'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function secretKey() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET is missing or too short (need 32+ characters)')
  return new TextEncoder().encode(secret)
}

export const hashPassword = (password) => bcrypt.hash(password, 12)
export const checkPassword = (password, hash) => bcrypt.compare(password, hash)

export function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    weeklyGoalWorkouts: u.weekly_goal_workouts,
    weeklyGoalMinutes: u.weekly_goal_minutes,
  }
}

function readCookie(req, name) {
  const header = req.headers?.cookie || ''
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return null
}

const isSecure = (req) =>
  process.env.NODE_ENV === 'production' || !!process.env.VERCEL || req.headers?.['x-forwarded-proto'] === 'https'

function cookie(req, value, maxAge, { name = COOKIE_NAME, httpOnly = true } = {}) {
  return [
    `${name}=${value}`,
    'Path=/',
    httpOnly ? 'HttpOnly' : null,
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    isSecure(req) ? 'Secure' : null,
  ]
    .filter(Boolean)
    .join('; ')
}

export async function startSession(req, res, userId) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey())
  res.setHeader('Set-Cookie', [cookie(req, token, MAX_AGE), cookie(req, '1', MAX_AGE, { name: HINT_COOKIE, httpOnly: false })])
}

export function endSession(req, res) {
  res.setHeader('Set-Cookie', [cookie(req, '', 0), cookie(req, '', 0, { name: HINT_COOKIE, httpOnly: false })])
}

// Returns the logged-in user row, or null. Invalid/expired tokens are treated as logged out.
export async function getSessionUser(req) {
  const token = readCookie(req, COOKIE_NAME)
  if (!token) return null
  let userId
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] })
    userId = Number(payload.sub)
  } catch {
    return null
  }
  if (!Number.isInteger(userId)) return null
  return one(
    'SELECT id, email, full_name, weekly_goal_workouts, weekly_goal_minutes FROM users WHERE id = $1',
    [userId]
  )
}
