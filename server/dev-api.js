// Local API server for `npm run dev`. Vite (port 5173) proxies /api/* here.
import { ensureEnv } from '../scripts/env.js'

const memory = process.argv.includes('--memory')
ensureEnv({ requireDatabase: !memory })

if (memory) {
  const { useMemoryDb } = await import('./memory-db.js')
  await useMemoryDb()
  console.log('⚠️  Using a temporary in-memory database (data is lost when the server stops).')
}

const { createApp, listRoutes } = await import('./app.js')
const PORT = Number(process.env.API_PORT) || 3001
const app = await createApp()

app.listen(PORT, () => {
  console.log(`✓ PulseFit API on http://localhost:${PORT}  (${listRoutes().length} routes from /api)`)
})
