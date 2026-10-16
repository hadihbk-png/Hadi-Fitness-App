import { neon } from '@neondatabase/serverless'

// Server-only: DATABASE_URL never reaches the browser.
let sql

export class DbUnavailableError extends Error {}

function client() {
  // Automated tests and the offline demo server inject an in-memory Postgres here.
  if (globalThis.__pulsefitDb) return globalThis.__pulsefitDb
  if (!process.env.DATABASE_URL) throw new DbUnavailableError('DATABASE_URL is not set')
  sql ??= neon(process.env.DATABASE_URL)
  return sql
}

// Run one parameterised statement and return its rows.
export async function query(text, params = []) {
  const db = client()
  try {
    return await db.query(text, params)
  } catch (err) {
    // Postgres errors carry a SQLSTATE code; anything without one is a connection problem.
    if (!err.code || /^(08|57P0|53)/.test(err.code)) throw new DbUnavailableError(err.message)
    throw err
  }
}

export async function one(text, params) {
  const rows = await query(text, params)
  return rows[0] ?? null
}
