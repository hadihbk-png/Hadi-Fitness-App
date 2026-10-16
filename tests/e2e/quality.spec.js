import AxeBuilder from '@axe-core/playwright'
import { test, expect, addExercises, revealAll, signUpViaApi } from './fixtures'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const summarize = (violations) =>
  violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.slice(0, 5).map((n) => n.target.join(' ')).join('\n    ')}`)

const PUBLIC = ['/', '/login', '/signup']
const PRIVATE = ['/dashboard', '/library']

async function waitForData(page) {
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
}

async function checkPage(page) {
  await waitForData(page)
  await revealAll(page)

  // Accessibility (incl. colour contrast)
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(summarize(violations), `axe on ${page.url()}`).toEqual([])

  // Every button/link has a readable name, every image has alt text
  const unnamed = await page.evaluate(() =>
    [...document.querySelectorAll('button, a[href], [role="tab"]')]
      .filter((el) => !(el.getAttribute('aria-label') || el.textContent).trim())
      .map((el) => el.outerHTML.slice(0, 100))
  )
  expect(unnamed).toEqual([])
  expect(await page.locator('img:not([alt])').count()).toBe(0)
}

async function checkNoSidewaysScroll(page) {
  await page.setViewportSize({ width: 375, height: 740 })
  await waitForData(page)
  await revealAll(page)
  await page.evaluate(() => window.scrollTo(500, window.scrollY))
  expect(await page.evaluate(() => window.scrollX), `sideways scroll on ${page.url()}`).toBe(0)
  const offenders = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const clipped = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (getComputedStyle(p).overflowX !== 'visible') return p.getBoundingClientRect().right <= vw + 1
      }
      return false
    }
    return [...document.body.querySelectorAll('*')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        if (!r.width || getComputedStyle(el).position === 'fixed') return false
        return (r.right > vw + 1 || r.left < -1) && !clipped(el)
      })
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 80))
  })
  expect(offenders, `content sticking out on ${page.url()}`).toEqual([])
}

for (const path of PUBLIC) {
  test(`quality: ${path} (accessibility, labels, contrast)`, async ({ page }) => {
    await page.goto(path)
    await checkPage(page)
  })
}

for (const path of PRIVATE) {
  test(`quality: ${path} (accessibility, labels, contrast)`, async ({ page }) => {
    await signUpViaApi(page)
    await addExercises(page, ['Plank', 'Burpee'])
    await page.goto(path)
    await checkPage(page)
  })
}

test('quality: live workout dialog', async ({ page }) => {
  await signUpViaApi(page)
  await addExercises(page, ['Plank'])
  await page.goto('/workout')
  const dialog = page.getByRole('dialog')
  await dialog.locator('button.set').first().click() // also show the rest timer
  await page.waitForTimeout(600)
  const { violations } = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(WCAG).analyze()
  expect(summarize(violations)).toEqual([])
})

test('no horizontal scrolling at 375px on any page', async ({ page }) => {
  for (const path of PUBLIC) {
    await page.goto(path)
    await checkNoSidewaysScroll(page)
  }
  await signUpViaApi(page)
  await addExercises(page, ['Deadlift'])
  for (const path of [...PRIVATE, '/workout']) {
    await page.goto(path)
    await checkNoSidewaysScroll(page)
  }
})
