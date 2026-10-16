// Runs before `npm run dev`: creates JWT_SECRET if needed and stops with instructions if DATABASE_URL is missing.
import { ensureEnv } from './env.js'

ensureEnv()
