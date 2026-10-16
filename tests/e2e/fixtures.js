import { test as base, expect } from '@playwright/test'

// Every test fails if the browser logs a console error/warning or throws.
// Each test gets a fresh browser profile and its own brand-new test user, and the API runs on a
// throwaway in-memory database, so real data is never touched and nothing is left behind.
export const test = base.extend({
  // Tests that deliberately trigger an error response can allow its console line, e.g. [/status of 409/]
  allowConsole: [[], { option: true }],
  consoleProblems: [
    async ({ page, allowConsole }, use) => {
      const problems = []
      page.on('console', (msg) => {
        if (msg.type() !== 'error' && msg.type() !== 'warning') return
        if (allowConsole.some((re) => re.test(msg.text()))) return
        problems.push(`${msg.type()}: ${msg.text()} (${page.url()})`)
      })
      page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`))
      await use(problems)
      expect(problems, 'browser console should be clean').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

let counter = 0
export const uniqueEmail = (tag = 'e2e') => `${tag}-${Date.now()}-${process.pid}-${++counter}@test.pulsefit.dev`
export const PASSWORD = 'Test1234!'

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Create and log in a test user through the API (shares cookies with the page)
export async function signUpViaApi(page, extra = {}) {
  const email = uniqueEmail()
  const res = await page.request.post('/api/auth/signup', {
    data: { fullName: 'Test Runner', email, password: PASSWORD, weeklyGoalWorkouts: 4, weeklyGoalMinutes: 150, ...extra },
  })
  expect(res.status()).toBe(201)
  return email
}

export async function addExercises(page, names) {
  const { exercises } = await (await page.request.get('/api/exercises')).json()
  for (const name of names) {
    const ex = exercises.find((e) => e.name === name)
    const res = await page.request.post('/api/workouts', { data: { action: 'add', exerciseId: ex.id, today: todayKey() } })
    expect(res.ok()).toBe(true)
  }
}

// Scroll the whole page so reveal-on-scroll sections and counters render
export async function revealAll(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight / 2
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' })
      await new Promise((r) => setTimeout(r, 120))
    }
  })
  await page.waitForTimeout(1500)
}

export async function onScreen(locator) {
  await locator.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  return locator
}
