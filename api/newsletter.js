// POST /api/newsletter { email } — footer "Weekly programs" sign-up (public). Signing up twice is fine.
import { query } from './_lib/db.js'
import { HttpError, route } from './_lib/http.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default route({
  async POST(req) {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, 'Please enter a valid email address.', 'invalid_input')
    await query('INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING', [email])
    return { message: "You're in! Weekly programs will land in your inbox." }
  },
})
