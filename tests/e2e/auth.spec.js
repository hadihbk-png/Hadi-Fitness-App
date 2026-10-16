import { test, expect, signUpViaApi, PASSWORD } from './fixtures'

test.describe('Login and route protection', () => {
  test('login sends you back to the page you wanted', async ({ page, context }) => {
    const email = await signUpViaApi(page)
    await context.clearCookies()
    await page.goto('/library')
    await expect(page).toHaveURL(/\/login\?next=%2Flibrary$/)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Log in' }).click()
    await expect(page).toHaveURL(/\/library$/)
    await expect(page.locator('.exercise-card')).toHaveCount(30)
  })

  test.describe('errors', () => {
    // The 400 and 409 responses are expected here
    test.use({ allowConsole: [/status of (400|409)/] })
    test('sign-up form shows friendly errors', async ({ page }) => {
    const email = await signUpViaApi(page)
    await page.context().clearCookies()
    await page.goto('/signup')
    await page.getByLabel('Your name').fill('Dup')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('short')
    await page.getByRole('button', { name: 'Create my account' }).click()
    await expect(page.getByRole('alert')).toContainText('at least 8 characters')
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Create my account' }).click()
    await expect(page.getByRole('alert')).toContainText('already exists')
    })
  })

  test('logged-in users visiting /login go to the Dashboard; Start goes to Dashboard', async ({ page }) => {
    await signUpViaApi(page)
    await page.goto('/login')
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto('/')
    await page.locator('.hero').getByRole('button', { name: /Start Your Workout/ }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('unknown pages show a friendly not-found screen', async ({ page }) => {
    await page.goto('/this-does-not-exist')
    await expect(page.getByRole('heading', { name: /skipped leg day/ })).toBeVisible()
  })
})
