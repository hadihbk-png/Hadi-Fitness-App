// npm run db:setup — creates the tables (db/schema.sql) and loads sample data (db/seed.sql).
// Safe to run again: tables use IF NOT EXISTS and seed rows are upserted by name.
import fs from 'node:fs'
import { Pool } from '@neondatabase/serverless'
import { ensureEnv } from './env.js'

ensureEnv()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

try {
  for (const file of ['db/schema.sql', 'db/seed.sql']) {
    await pool.query(fs.readFileSync(file, 'utf8'))
    console.log(`✓ ran ${file}`)
  }
  const { rows } = await pool.query(`
    SELECT 'exercises' AS table_name, count(*)::int AS rows FROM exercises
    UNION ALL SELECT 'classes', count(*)::int FROM classes
    UNION ALL SELECT 'users', count(*)::int FROM users
    UNION ALL SELECT 'workouts', count(*)::int FROM workouts`)
  console.log('\nRow counts:')
  console.table(rows)
} catch (err) {
  console.error('\n✗ Database setup failed:', err.message)
  if (/password authentication|getaddrinfo|ENOTFOUND|ECONNREFUSED|timeout/i.test(err.message)) {
    console.error('  Check that DATABASE_URL in .env is the full connection string copied from Neon → Connect.')
  }
  process.exitCode = 1
} finally {
  await pool.end()
}
