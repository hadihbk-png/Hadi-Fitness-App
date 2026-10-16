import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_PORT = Number(process.env.API_PORT) || 3001

export default defineConfig({
  plugins: [react()],
  server: {
    // /api/* is served by the local Express server (server/dev-api.js), which loads the same /api files Vercel uses
    proxy: { '/api': `http://localhost:${API_PORT}` },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/unit/setup.js'],
    include: ['tests/**/*.test.{js,jsx}'],
  },
})
