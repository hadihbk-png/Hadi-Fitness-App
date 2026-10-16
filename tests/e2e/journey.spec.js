import { test, expect, onScreen, revealAll, uniqueEmail, PASSWORD } from './fixtures'

const GROUPS = ['Chest', 'Back', 'Legs', 'Arms', 'Core', 'Cardio']

test('full journey: sign up → library → live workout → dashboard updates → refresh → logout', async ({ page }) => {
  // Sign up, land on Dashboard
  await page.goto('/signup')
  await page.getByLabel('Your name').fill('Test Runner')
  await page.getByLabel('Email').fill(uniqueEmail('journey'))
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByLabel('Workouts / week').fill('4')
  await page.getByLabel('Active minutes / week').fill('150')
  await page.getByRole('button', { name: 'Create my account' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('status')).toContainText('Welcome to PulseFit, Test!')
  await expect(page.locator('.user-chip')).toHaveAccessibleName('Signed in as Test')
  await expect(page.locator('.workout-card')).toContainText('No workout yet today.')

  // Workout Library: every muscle-group filter shows only its own 5 cards
  await page.getByRole('link', { name: 'Library' }).first().click()
  await expect(page).toHaveURL(/\/library$/)
  await expect(page.locator('.exercise-card')).toHaveCount(30)
  for (const g of GROUPS) {
    await page.getByRole('tab', { name: g }).click()
    await expect(page.locator(`.exercise-card.mg-${g.toLowerCase()}`)).toHaveCount(5)
    await expect(page.locator('.exercise-card')).toHaveCount(5)
  }

  // Add 2 exercises to today's workout
  const added = []
  for (const g of ['Chest', 'Core']) {
    await page.getByRole('tab', { name: g }).click()
    const card = page.locator(`.exercise-card.mg-${g.toLowerCase()}`).first()
    const name = await card.locator('h3').innerText()
    await card.getByRole('button', { name: /Add to today/ }).click()
    await expect(card.getByRole('button', { name: /Added to today/ })).toBeVisible()
    await expect(page.getByRole('status')).toContainText(`Added ${name}`)
    added.push(name)
  }
  await expect(page.locator('.today-bar')).toContainText('2 exercises')

  // Dashboard shows today's workout; Start opens Live Workout
  await page.getByRole('link', { name: 'Dashboard' }).first().click()
  const card = page.locator('.workout-card')
  await expect(card.locator('h3')).toHaveText('Chest & Core')
  await expect(card.locator('.ex-name')).toHaveText(added)
  await card.getByRole('button', { name: /Start Chest & Core/ }).click()
  await expect(page).toHaveURL(/\/workout$/)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Chest & Core' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Finish' })).toBeDisabled()

  // Rest timer starts at that exercise's rest_seconds and counts down
  const firstEx = dialog.locator('.session-ex').first()
  const restSeconds = Number((await firstEx.locator('.muted').innerText()).match(/(\d+)s rest/)[1])
  await firstEx.locator('button.set').first().click()
  const rest = dialog.locator('.rest .ring-center strong')
  await expect(rest).toHaveText(new RegExp(`^(${restSeconds}|${restSeconds - 1})s$`))
  await expect.poll(async () => parseInt(await rest.innerText()), { timeout: 5000 }).toBeLessThan(restSeconds - 1)

  // Tick every set (each tick is saved straight away)
  const sets = dialog.locator('button.set')
  const total = await sets.count()
  for (let i = 0; i < total; i++) {
    if ((await sets.nth(i).getAttribute('aria-pressed')) !== 'true') {
      const saved = page.waitForResponse((r) => r.url().endsWith('/api/sets') && r.ok())
      await sets.nth(i).click()
      await saved
    }
  }
  await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(total))

  // Finish → confetti and the done screen
  await dialog.getByRole('button', { name: 'Finish' }).click()
  await expect(dialog.getByRole('heading', { name: /crushed/ })).toBeVisible()
  await expect(page.locator('body > canvas')).toHaveCount(1) // canvas-confetti
  await expect(dialog.locator('.done-stats')).toContainText(`${total}/${total}`)
  await dialog.getByRole('button', { name: 'See my progress' }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/dashboard#progress$/)

  const checkDashboard = async () => {
    await revealAll(page)
    await expect(page.locator('.workout-card')).toContainText('Workout done today')
    await expect(await onScreen(page.locator('.streak-num'))).toHaveText('1')
    await expect(page.locator('.streak-day.is-today')).toHaveClass(/is-lit/)
    await expect(page.locator('.bar-col')).toHaveCount(7)
    const todayMinutes = Number(await page.locator('.bar-col.is-today .bar-value').innerText())
    expect(todayMinutes).toBeGreaterThanOrEqual(1)
    const rings = page.locator('.ring-stat')
    await expect(rings.nth(0)).toContainText('25% of 4 this week')
    await expect(rings.nth(1)).toContainText(`% of 150 min`)
    await expect(rings.nth(2)).toContainText('0 of 2 weekly goals')
    // Ring drawings stay within 0–100% and never NaN
    const offsets = await page.locator('.ring-stat .ring-value').evaluateAll((els) =>
      els.map((el) => [el.getAttribute('stroke-dashoffset'), Number(el.getAttribute('stroke-dasharray'))])
    )
    for (const [off, len] of offsets) {
      expect(off).not.toBe('NaN')
      expect(Number(off)).toBeGreaterThanOrEqual(0)
      expect(Number(off)).toBeLessThanOrEqual(len)
    }
    await expect(page.locator('.records li').first()).toContainText('Chest & Core')
  }
  await checkDashboard()

  // Refresh: everything is still there (it's in the database)
  await page.reload()
  await checkDashboard()

  // Logout → protected pages redirect to login
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('status')).toContainText('logged out')
  for (const path of ['/dashboard', '/library', '/workout']) {
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}$`))
  }
})
