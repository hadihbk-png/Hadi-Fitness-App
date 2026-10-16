import { defineConfig, devices } from '@playwright/test'

// Browser tests run the real production build + the real /api routes,
// backed by a throwaway in-memory Postgres (never your Neon data).
const API_PORT = 3101
const WEB_PORT = 4174
const env = { ...process.env, API_PORT: String(API_PORT) }

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    // iPhone-size screen (375px wide), rendered with Chromium
    { name: 'mobile-iphone', use: { ...devices['iPhone 13 Mini'], browserName: 'chromium' } },
  ],
  webServer: [
    {
      command: 'node server/dev-api.js --memory',
      url: `http://localhost:${API_PORT}/api/stats`,
      env,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npm run build && npx vite preview --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
