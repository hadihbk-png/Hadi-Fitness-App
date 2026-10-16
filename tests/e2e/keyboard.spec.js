import { test, expect, addExercises, signUpViaApi } from './fixtures'

async function tabTo(page, predicate, max = 25) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    if (await page.evaluate(predicate)) return true
  }
  return false
}

test.describe('Keyboard', () => {
  test('Tab reaches the main Start button and Enter uses it', async ({ page }) => {
    await page.goto('/')
    const found = await tabTo(page, () => document.activeElement?.tagName === 'BUTTON' && /start/i.test(document.activeElement.textContent))
    expect(found, 'a Start button is reachable with Tab').toBe(true)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('sign-up form works with the keyboard only', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel('Your name').focus()
    await page.keyboard.type('Keys Only')
    await page.keyboard.press('Tab')
    await page.keyboard.type(`keys-${Date.now()}@test.pulsefit.dev`)
    await page.keyboard.press('Tab')
    await page.keyboard.type('Test1234!')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('live workout: focus moves in, stays in, Space ticks a set, Escape closes and focus returns', async ({ page }) => {
    await signUpViaApi(page)
    await addExercises(page, ['Push-up'])
    await page.goto('/dashboard')
    const start = page.locator('.workout-card').getByRole('button', { name: /Start/ })
    await start.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused()
    await expect(dialog.locator('button.set')).toHaveCount(3)

    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    }
    const set = dialog.locator('button.set').first()
    await set.focus()
    await page.keyboard.press('Space')
    await expect(set).toHaveAttribute('aria-pressed', 'true')

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(start).toBeFocused()
  })

  test('library filters and add buttons work with the keyboard', async ({ page }) => {
    await signUpViaApi(page)
    await page.goto('/library')
    const legs = page.getByRole('tab', { name: 'Legs' })
    await legs.focus()
    await page.keyboard.press('Enter')
    await expect(legs).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.exercise-card.mg-legs')).toHaveCount(5)
    const add = page.locator('.exercise-card').first().getByRole('button', { name: /Add to today/ })
    await add.focus()
    await page.keyboard.press('Space')
    await expect(page.locator('.exercise-card').first().getByRole('button', { name: /Added to today/ })).toBeVisible()
  })
})
