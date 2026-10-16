# PulseFit — Test Report

Date: 16 October 2026

## Summary

| Suite | Tests | Passed | Failed |
|---|---|---|---|
| Backend / API tests (Vitest + Supertest), incl. streak & ring logic | 28 | 28 | 0 |
| Frontend unit tests (Vitest) | 3 | 3 | 0 |
| Browser tests (Playwright): 22 scenarios × 2 screens (desktop Chrome + iPhone 13 Mini, 375px) | 44 | 44 | 0 |
| **Total** | **75** | **75** | **0** |

- **One command runs everything:** `npm run test:all` (`npm test` = backend + unit, `npm run test:e2e` = browser).
- `npm run build` completes with zero errors and zero warnings.
- Every browser test fails if the console shows any error or warning. The only exception is one test that deliberately submits a bad sign-up, where the 400/409 responses are expected.

### Your real data is never touched

All tests run against a **throwaway in-memory Postgres** built from the same `db/schema.sql` and `db/seed.sql` that Neon uses. They never connect to Neon.

- Each browser test creates its own brand-new test user (`…@test.pulsefit.dev`).
- The backend tests delete their test users at the end and check that none are left.

## What is tested

**Backend / API (every `/api` route, success and failure)**
- Sign up works; duplicate email (any capitalisation), weak, empty or letters-only passwords and bad emails are blocked.
- Login works; wrong password and unknown email both fail. Logout clears the cookie; `/api/auth/me` returns the user when logged in and 401 when logged out. Tampered cookies are rejected.
- `/api/stats` returns members, workouts completed and classes this week as numbers.
- `/api/exercises` returns all 30; each of the 6 muscle-group filters returns exactly its 5; unknown groups are rejected.
- `/api/workouts`: today's workout is created on the first add, with all sets; duplicates are ignored. Start → complete works. A finished workout can't be changed or finished twice. Removing the last exercise removes the empty workout.
- `/api/sets`: tick and untick.
- `/api/dashboard`: streak, a 7-day chart with today last, ring numbers, weekly goals and recent workouts.
- `/api/classes`: list, book, cancel; you must be logged in to book.
- **Security:** user B cannot see, tick, start, finish or remove anything in user A's workout, and A's data is unchanged afterwards. All protected routes return 401 without login.
- Database unreachable: the API returns a clear 503 message instead of crashing. Impossible dates are rejected.

**Streak and stats (fake dates)**
- No workouts → 0.
- 3 days in a row → 3.
- A missed day resets the streak.
- Today plus yesterday → 2.
- Not trained yet today keeps yesterday's streak alive.
- The streak works across month boundaries, and the longest streak is tracked.
- Progress rings never go above 100% and never show NaN, in the API numbers, the drawn ring, and when goals are beaten.

**Browser, on desktop and iPhone size**
- Landing: "PulseFit" in the navbar, headline and tab title. The counters animate up to the real `/api/stats` numbers. Classes load (10), and each class-type filter works.
- "Start Your Workout" goes to sign up when logged out, and to the Dashboard when logged in.
- Full journey:
  1. Sign up, land on the Dashboard.
  2. Each muscle-group filter shows only its 5 cards.
  3. Add 2 exercises.
  4. The Dashboard shows today's workout; click Start.
  5. The rest timer starts at that exercise's own rest time and counts down.
  6. Tick every set (each saved instantly), then finish. Confetti appears.
  7. The Dashboard updates: streak 1, today's chart bar, rings, recent workouts.
  8. Refresh: everything is still there.
  9. Log out: `/dashboard`, `/library` and `/workout` all redirect to login.
- Login returns you to the page you wanted. Sign-up shows friendly errors. Unknown pages show a not-found screen.
- Keyboard: Tab reaches Start, and the sign-up form works keys-only. In Live Workout, focus moves into the popup and stays there, Space ticks a set, and Escape closes it and returns focus. Library filters and add buttons work with the keyboard.
- Quality:
  - An automated accessibility scan (axe, WCAG 2.2 AA, including colour contrast) passes on `/`, `/login`, `/signup`, `/dashboard`, `/library` and the Live Workout popup.
  - Every button and link has a readable name, and there are no images without alt text.
  - There is no sideways scrolling at 375px on any page.

## Bugs found and fixed

| # | Bug | Fix |
|---|---|---|
| 1 | **Screen readers heard a different name for the navbar name chip** than what's on screen ("Signed in as Test Runner" vs "TR Test"), an accessibility failure on every logged-in page. | The visible first name is now part of the spoken name ("Signed in as Test"); the initials are hidden from screen readers. On phones the name stays visually hidden, so the look is unchanged. |
| 2 | **Ring captions and weekly bars could read over 100%** (e.g. "125% of 4 this week") after beating a goal. | The API caps these percentages at 0–100% and never returns NaN. The real counts (e.g. "5 of 4") are still shown. |
| 3 | Found while testing the database step: **an impossible date (e.g. 2026-13-45) crashed the API** with a server error. | Dates are validated properly and rejected with a 400. |
| 4 | Found while testing the database step: **every logged-out page load logged a "401" error** in the browser console from the login check. | The server also sets a harmless, non-secret `pf_logged_in` cookie, so the check is skipped when nobody is logged in. |
| 5 | **The footer "Weekly programs" email box did nothing** when you pressed the arrow. | Emails are now saved (new `newsletter_subscribers` table and `/api/newsletter` route); you get a confirmation or a friendly error. Signing up twice is harmless. |
| 6 | **Dashboard quotes rotated every 6 seconds with no way to pause** (WCAG 2.2.2). | Rotation pauses while the quote card is hovered or focused, and is off for people who've asked for reduced motion. The look is unchanged. |

## Lighthouse scores

These are production builds, measured on this PC. Mobile uses Lighthouse's slow-phone simulation, and each mobile figure is the middle of 3 runs. Order: Performance / Accessibility / Best Practices / SEO.

| Page | Mobile before | Mobile after | Desktop before | Desktop after |
|---|---|---|---|---|
| Landing `/` | 94 / 100 / 100 / 100 | 94 / 100 / 100 / 100 | 99 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| Login | 98 / 100 / 100 / 100 | 97 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| Dashboard | 97 / 100 / 100 / 100 | 97 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| Library | 97 / 100 / 100 / 100 | 97 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |

Nothing scored below 90, so no performance changes were needed; 1-point differences are normal run-to-run noise. Lighthouse's own accessibility check didn't catch bug #1; the stricter axe scan in the browser tests did.

Lighthouse suggests "text compression" only because the local preview server doesn't compress files. Vercel compresses automatically.

## Please check by hand

1. **Connect Neon before going live.** No Neon database is connected yet, so all tests used the in-memory copy. Once you have the link:
   - put it in `.env`
   - run `npm run db:setup`, which should report 30 exercises and 10 classes
   - sign up once, restart `npm run dev`, and confirm your data is still there
   - in Vercel, add `DATABASE_URL` and `JWT_SECRET` (the same value as in `.env`)
2. **On a real iPhone in Safari.** The "iPhone" tests use Chrome at iPhone size.
3. **The phone picture in the landing hero is a sample illustration** ("Push Power", "21-day streak"), not real data.
4. **An old PulseFit dev server may still be running on port 5173**, from before the database was added. Close it so `npm run dev` gets http://localhost:5173.
5. **Developer tools have moderate security warnings** (`npm audit`): Vite 5 and Vitest 2 have advisories that only affect the local dev server. The live site's packages have none (`npm audit --omit=dev` finds 0). Fixing them means major upgrades (Vite 8, Vitest 4), best done as a separate step.
