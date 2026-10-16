// Local stand-in for Vercel's /api functions: every file in /api becomes a route, exactly as on Vercel.
//   api/stats.js            -> /api/stats
//   api/auth/[action].js    -> /api/auth/:action   (req.query.action)
// Files and folders starting with "_" (e.g. api/_lib) are helpers, not routes — same rule as Vercel.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import express from 'express'

const API_DIR = path.resolve(import.meta.dirname, '..', 'api')

function findRoutes(dir, prefix = '/api') {
  const routes = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      routes.push(...findRoutes(full, `${prefix}/${entry.name.replace(/^\[(.+)\]$/, ':$1')}`))
    } else if (entry.name.endsWith('.js')) {
      const base = entry.name.slice(0, -3)
      const segment = base === 'index' ? '' : `/${base.replace(/^\[(.+)\]$/, ':$1')}`
      routes.push({ file: full, url: `${prefix}${segment}` || '/' })
    }
  }
  // Static paths before dynamic ones, like Vercel
  return routes.sort((a, b) => a.url.includes(':') - b.url.includes(':'))
}

export async function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '100kb' }))

  for (const { file, url } of findRoutes(API_DIR)) {
    // Node needs a file:// URL on Windows; Vitest's loader wants the plain path (folder names may contain spaces)
    const { default: handler } = await import(/* @vite-ignore */ process.env.VITEST ? file : pathToFileURL(file).href)
    app.all(url, (req, res, next) => {
      // Vercel exposes dynamic path segments on req.query
      req.query = { ...req.query, ...req.params }
      Promise.resolve(handler(req, res)).catch(next)
    })
  }

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))
  // Malformed JSON bodies etc.
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' })
    console.error(err)
    res.status(500).json({ error: 'Something went wrong on our side. Please try again.' })
  })
  return app
}

export const listRoutes = () => findRoutes(API_DIR).map((r) => r.url)
