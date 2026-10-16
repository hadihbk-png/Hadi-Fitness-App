import { test, expect } from './fixtures'

test.describe('Landing page (logged out)', () => {
  test('shows PulseFit in the navbar, headline copy and tab title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/PulseFit/)
    await expect(page.locator('header.navbar .logo-text')).toHaveText('PulseFit')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Train smarter.')
    await expect(page.locator('.hero-sub')).toContainText('PulseFit')
  })

  test('counters animate up to the real /api/stats numbers', async ({ page }) => {
    await page.addInitScript(() => {
      window.__seen = new Set()
      new MutationObserver(() => {
        const el = document.querySelectorAll('.hero-stats .counter')[2]
        if (el) window.__seen.add(el.textContent)
      }).observe(document, { subtree: true, childList: true, characterData: true })
    })
    const statsResponse = page.waitForResponse('**/api/stats')
    await page.goto('/')
    const stats = await (await statsResponse).json()
    expect(stats).toEqual({ members: expect.any(Number), workoutsCompleted: expect.any(Number), classesThisWeek: 10 })
    const counters = page.locator('.hero-stats .counter')
    await expect(counters.nth(2)).toHaveText('10')
    await expect(counters.nth(0)).toHaveText(String(stats.members))
    const seen = await page.evaluate(() => [...window.__seen])
    expect(seen.length, `values seen: ${seen}`).toBeGreaterThan(2) // it counted up, not jumped
    await expect(page.locator('.hero-stats')).toContainText('Classes this week')
  })

  test('"Start Your Workout" goes to sign up when logged out', async ({ page }) => {
    await page.goto('/')
    await page.locator('.hero').getByRole('button', { name: /Start Your Workout/ }).click()
    await expect(page).toHaveURL(/\/signup$/)
    await expect(page.getByRole('button', { name: 'Create my account' })).toBeVisible()
  })

  test('classes load from the database and each type filter works', async ({ page }) => {
    await page.goto('/#classes')
    const section = page.locator('#classes')
    await expect(section.locator('.class-card h3')).toHaveCount(10)
    const tabs = await section.getByRole('tab').allInnerTexts()
    expect(tabs[0]).toBe('All')
    for (const type of tabs.slice(1)) {
      await section.getByRole('tab', { name: type }).click()
      const labels = await section.locator('.class-type').allInnerTexts()
      expect(labels.length).toBeGreaterThan(0)
      expect(labels.every((l) => l.toLowerCase() === type.toLowerCase())).toBe(true)
    }
  })

  test('booking a class when logged out asks you to sign up', async ({ page }) => {
    await page.goto('/#classes')
    await page.locator('.class-card').first().getByRole('button', { name: /Book spot/ }).click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('footer "Weekly programs" sign-up saves the email and confirms', async ({ page }) => {
    await page.goto('/')
    const input = page.getByLabel('Email for weekly programs')
    await input.fill(`news-${Date.now()}@test.pulsefit.dev`)
    await page.getByRole('button', { name: 'Subscribe' }).click()
    await expect(page.getByRole('status')).toContainText("You're in!")
    await expect(input).toHaveValue('')
  })
})
