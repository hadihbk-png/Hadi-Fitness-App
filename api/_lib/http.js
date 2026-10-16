import { DbUnavailableError } from './db.js'
import { getSessionUser } from './auth.js'

export class HttpError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const DB_DOWN_MESSAGE = "We can't reach the PulseFit database right now. Please try again in a moment."

/**
 * Wraps a Vercel-style handler: per-method dispatch, optional login check and consistent JSON errors.
 *   export default route({ GET: (req, res, ctx) => ..., POST: ... }, { auth: true })
 * ctx.user is the logged-in user (or null when auth is optional).
 */
export function route(methods, { auth = false } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store')
    const fn = methods[req.method]
    if (!fn) {
      res.setHeader('Allow', Object.keys(methods).join(', '))
      return res.status(405).json({ error: 'Method not allowed' })
    }
    try {
      const user = await getSessionUser(req)
      if (auth && !user) throw new HttpError(401, 'Please log in to continue.', 'unauthorized')
      if (req.body == null || typeof req.body !== 'object') req.body = {}
      const result = await fn(req, res, { user })
      if (!res.headersSent) res.status(200).json(result ?? { ok: true })
    } catch (err) {
      if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, code: err.code })
      if (err instanceof DbUnavailableError) {
        console.error('[db unavailable]', err.message)
        return res.status(503).json({ error: DB_DOWN_MESSAGE, code: 'db_unavailable' })
      }
      console.error(err)
      return res.status(500).json({ error: 'Something went wrong on our side. Please try again.', code: 'server_error' })
    }
  }
}

export const toInt = (v) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '') ? Number(v) : NaN)

export function requireInt(v, name, { min = 1, max = 2_147_483_647 } = {}) {
  const n = toInt(v)
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${name} is invalid.`, 'invalid_input')
  return n
}
