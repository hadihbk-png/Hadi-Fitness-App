// In-memory Postgres (PGlite) with the real schema + seed, for automated tests and offline demos.
// Never used in production: it is only activated by tests or `npm run dev:memory`.
import fs from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const DB_DIR = path.resolve(import.meta.dirname, '..', 'db')

export async function createMemoryDb() {
  const pg = new PGlite()
  await pg.exec(fs.readFileSync(path.join(DB_DIR, 'schema.sql'), 'utf8'))
  await pg.exec(fs.readFileSync(path.join(DB_DIR, 'seed.sql'), 'utf8'))
  return {
    pg,
    query: async (text, params = []) => (await pg.query(text, params)).rows,
    close: () => pg.close(),
  }
}

export async function useMemoryDb() {
  const db = await createMemoryDb()
  globalThis.__pulsefitDb = db
  return db
}
