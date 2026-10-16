// Tiny client for our own /api routes. The browser never talks to the database directly.
export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const OFFLINE_MESSAGE = "Can't reach PulseFit right now. Check your connection and try again."

export async function api(path, { method = 'GET', body, signal } = {}) {
  let res
  try {
    res = await fetch(path, {
      method,
      signal,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError(OFFLINE_MESSAGE, 0, 'network')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    // No JSON body usually means the API server itself isn't running (e.g. the dev proxy got ECONNREFUSED)
    if (!data) throw new ApiError(OFFLINE_MESSAGE, res.status, 'network')
    throw new ApiError(data.error || 'Something went wrong. Please try again.', res.status, data.code)
  }
  return data
}

export const isConnectionProblem = (err) => err?.code === 'db_unavailable' || err?.code === 'network'

// The user's local calendar day, so "today" matches their clock not the server's
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
