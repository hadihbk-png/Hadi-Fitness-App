// Loads .env for local scripts (Vercel injects env vars itself in production).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ENV_PATH = path.resolve(process.cwd(), '.env')

export const NEON_HELP = `
  DATABASE_URL is missing from your .env file.

  Get it from Neon (free):
    1. Go to https://console.neon.tech and sign in (or sign up, it's free).
    2. Create a project (any name, e.g. "pulsefit", pick the region closest to you).
    3. On the project dashboard click the "Connect" button (top right).
    4. In "Connect to your database" keep Branch: main, Database: neondb, Role: neondb_owner,
       make sure "Connection pooling" is ON, then click "Show password" and copy the
       connection string. It looks like:
         postgresql://neondb_owner:xxxx@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
    5. Paste it into the .env file in this folder:
         DATABASE_URL=postgresql://...
    6. Run:  npm run db:setup   and then   npm run dev
`

export function ensureEnv({ requireDatabase = true } = {}) {
  if (fs.existsSync(ENV_PATH)) process.loadEnvFile(ENV_PATH)

  if (!process.env.JWT_SECRET) {
    const secret = crypto.randomBytes(48).toString('base64url')
    const existing = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : ''
    const prefix = existing && !existing.endsWith('\n') ? '\n' : ''
    const hasEmptyKey = /^JWT_SECRET=\s*$/m.test(existing)
    const next = hasEmptyKey
      ? existing.replace(/^JWT_SECRET=\s*$/m, `JWT_SECRET=${secret}`)
      : `${existing}${prefix}JWT_SECRET=${secret}\n`
    fs.writeFileSync(ENV_PATH, next)
    process.env.JWT_SECRET = secret
    console.log('🔐 Generated a strong random JWT_SECRET and saved it to .env')
  }

  if (requireDatabase && !process.env.DATABASE_URL) {
    if (!/^DATABASE_URL=/m.test(fs.readFileSync(ENV_PATH, 'utf8'))) fs.appendFileSync(ENV_PATH, 'DATABASE_URL=\n')
    console.error(NEON_HELP)
    process.exit(1)
  }
}
