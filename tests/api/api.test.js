// @vitest-environment node
// Backend tests: real /api route files, real schema + seed, in an in-memory Postgres (no Neon needed).
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { useMemoryDb } from '../../server/memory-db.js'
import { createApp } from '../../server/app.js'
import { computeStreak, longestStreak, percent } from '../../api/_lib/stats.js'
import { addDays } from '../../api/_lib/dates.js'

process.env.JWT_SECRET = 'test-secret-that-is-definitely-longer-than-32-chars'
const TODAY = new Date().toISOString().slice(0, 10)

let app, db
beforeAll(async () => {
  db = await useMemoryDb()
  app = await createApp()
})
afterAll(async () => {
  // Clean up: remove every test user (their workouts, sets and bookings cascade)
  await db.query(`DELETE FROM users WHERE email LIKE '%@pulsefit.com'`)
  const [{ n }] = await db.query('SELECT count(*)::int AS n FROM users')
  expect(n).toBe(0)
  delete globalThis.__pulsefitDb
  await db.close()
})

const signup = (agent, email, extra = {}) =>
  agent.post('/api/auth/signup').send({ fullName: 'Test User', email, password: 'Test1234!', weeklyGoalWorkouts: 3, weeklyGoalMinutes: 90, ...extra })

describe('auth', () => {
  it('signs up, returns the user and sets an httpOnly cookie', async () => {
    const res = await signup(request(app), 'a@pulsefit.com')
    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({ email: 'a@pulsefit.com', fullName: 'Test User', weeklyGoalWorkouts: 3, weeklyGoalMinutes: 90 })
    expect(res.body.user.password_hash).toBeUndefined()
    expect(res.headers['set-cookie'][0]).toMatch(/pf_session=.+; Path=\/; HttpOnly; SameSite=Lax/)
  })

  it('blocks duplicate email (case-insensitive), weak and empty passwords', async () => {
    expect((await signup(request(app), 'A@PulseFit.com')).status).toBe(409)
    expect((await signup(request(app), 'w@pulsefit.com', { password: 'short1' })).status).toBe(400)
    expect((await signup(request(app), 'w@pulsefit.com', { password: 'onlyletters' })).status).toBe(400)
    expect((await signup(request(app), 'w@pulsefit.com', { password: '' })).status).toBe(400)
    expect((await signup(request(app), 'not-an-email')).status).toBe(400)
  })

  it('logs in, rejects a wrong password, /me works, logout clears the cookie', async () => {
    const agent = request.agent(app)
    expect((await agent.post('/api/auth/login').send({ email: 'a@pulsefit.com', password: 'nope1234' })).status).toBe(401)
    expect((await agent.post('/api/auth/login').send({ email: 'ghost@pulsefit.com', password: 'Test1234!' })).status).toBe(401)
    expect((await agent.post('/api/auth/login').send({ email: 'a@pulsefit.com', password: 'Test1234!' })).status).toBe(200)
    expect((await agent.get('/api/auth/me')).body.user.email).toBe('a@pulsefit.com')
    const out = await agent.post('/api/auth/logout')
    expect(out.headers['set-cookie'][0]).toMatch(/pf_session=; .*Max-Age=0/)
    expect((await agent.get('/api/auth/me')).status).toBe(401)
  })

  it('protected routes return 401 when logged out; tampered cookies are rejected', async () => {
    for (const [method, url] of [['get', '/api/dashboard'], ['get', '/api/exercises'], ['get', '/api/workouts'], ['post', '/api/workouts'], ['patch', '/api/sets']]) {
      expect((await request(app)[method](url)).status, url).toBe(401)
    }
    expect((await request(app).get('/api/auth/me').set('Cookie', 'pf_session=abc.def.ghi')).status).toBe(401)
  })
})

describe('public data', () => {
  it('/api/stats returns numbers', async () => {
    const { body } = await request(app).get('/api/stats')
    expect(body).toEqual({ members: expect.any(Number), workoutsCompleted: expect.any(Number), classesThisWeek: 10 })
  })

  it('/api/classes returns the 10 seeded classes', async () => {
    const { body } = await request(app).get('/api/classes')
    expect(body.classes).toHaveLength(10)
    expect(body.classes[0]).toMatchObject({ title: expect.any(String), spotsLeft: expect.any(Number), myBooking: null })
  })
})

describe('library, workouts and sets', () => {
  let agent, workout

  beforeAll(async () => {
    agent = request.agent(app)
    await signup(agent, 'b@pulsefit.com')
  })

  it('returns all 30 exercises and filters by each muscle group', async () => {
    expect((await agent.get('/api/exercises')).body.exercises).toHaveLength(30)
    for (const g of ['Chest', 'Back', 'Legs', 'Arms', 'Core', 'Cardio']) {
      const list = (await agent.get(`/api/exercises?muscle=${g}`)).body.exercises
      expect(list).toHaveLength(5)
      expect(list.every((e) => e.muscleGroup === g)).toBe(true)
    }
    expect((await agent.get('/api/exercises?muscle=Neck')).status).toBe(400)
  })

  it('has no workout today until an exercise is added', async () => {
    const { body } = await agent.get(`/api/workouts?today=${TODAY}`)
    expect(body.workout).toBeNull()
  })

  it('adds exercises to today’s workout with all their sets, ignoring duplicates', async () => {
    const [bench] = (await agent.get('/api/exercises?muscle=Chest')).body.exercises
    const [plank] = (await agent.get('/api/exercises?muscle=Core')).body.exercises
    await agent.post('/api/workouts').send({ action: 'add', exerciseId: bench.id, today: TODAY }).expect(200)
    const res = await agent.post('/api/workouts').send({ action: 'add', exerciseId: plank.id, today: TODAY })
    const dup = await agent.post('/api/workouts').send({ action: 'add', exerciseId: plank.id, today: TODAY })
    expect(dup.body.added).toBe(false)
    workout = res.body.workout
    expect(workout.status).toBe('planned')
    expect(workout.name).toBe('Chest & Core')
    expect(workout.exercises.map((e) => e.name)).toEqual([bench.name, plank.name])
    expect(workout.exercises[0].sets).toHaveLength(bench.sets)
    expect(workout.exercises[0].restSeconds).toBe(bench.restSeconds)
  })

  it('starts, ticks and unticks sets, completes', async () => {
    const start = await agent.post('/api/workouts').send({ action: 'start', workoutId: workout.id })
    expect(start.body.status).toBe('in_progress')
    const set = workout.exercises[0].sets[0]
    expect((await agent.patch('/api/sets').send({ setId: set.id, completed: true })).body.completed).toBe(true)
    expect((await agent.patch('/api/sets').send({ setId: set.id, completed: false })).body.completed).toBe(false)
    await agent.patch('/api/sets').send({ setId: set.id, completed: true })
    const done = await agent.post('/api/workouts').send({ action: 'complete', workoutId: workout.id, durationMinutes: 42 })
    expect(done.body).toMatchObject({ status: 'completed', durationMinutes: 42, sets: { done: 1 } })
    // A finished workout can't be changed or finished twice
    expect((await agent.patch('/api/sets').send({ setId: set.id, completed: false })).status).toBe(404)
    expect((await agent.post('/api/workouts').send({ action: 'complete', workoutId: workout.id })).status).toBe(404)
  })

  it('dashboard reflects the finished workout', async () => {
    const { body } = await agent.get(`/api/dashboard?today=${TODAY}`)
    expect(body.workout).toBeNull()
    expect(body.completedToday).toEqual({ count: 1, minutes: 42 })
    expect(body.streak.current).toBe(1)
    expect(body.chart.days).toHaveLength(7)
    expect(body.chart.days[6]).toMatchObject({ label: 'Today', minutes: 42 })
    expect(body.week).toMatchObject({ workouts: 1, minutes: 42, goalWorkouts: 3, goalMinutes: 90, workoutsPct: 33, minutesPct: 47, goalsHit: 0 })
    expect(body.recent[0]).toMatchObject({ name: 'Chest & Core', minutes: 42, sets: 1 })
  })

  it('adding again after finishing starts a fresh workout for today', async () => {
    const [row] = (await agent.get('/api/exercises?muscle=Legs')).body.exercises
    const res = await agent.post('/api/workouts').send({ action: 'add', exerciseId: row.id, today: TODAY })
    expect(res.body.workout.id).not.toBe(workout.id)
    expect(res.body.completedToday.count).toBe(1)
    // and removing its only exercise removes the empty workout
    const removed = await agent.post('/api/workouts').send({ action: 'remove', workoutExerciseId: res.body.workout.exercises[0].id, today: TODAY })
    expect(removed.body.workout).toBeNull()
  })

  it('rejects silly dates', async () => {
    expect((await agent.get('/api/workouts?today=2001-01-01')).status).toBe(400)
    expect((await agent.get('/api/workouts?today=2026-13-45')).status).toBe(400)
  })
})

describe('security: users only see and change their own data', () => {
  let alice, bob, aliceWorkout

  beforeAll(async () => {
    alice = request.agent(app)
    bob = request.agent(app)
    await signup(alice, 'alice@pulsefit.com')
    await signup(bob, 'bob@pulsefit.com')
    const [ex] = (await alice.get('/api/exercises')).body.exercises
    aliceWorkout = (await alice.post('/api/workouts').send({ action: 'add', exerciseId: ex.id, today: TODAY })).body.workout
  })

  it("bob can't see alice's workout", async () => {
    expect((await bob.get(`/api/workouts?today=${TODAY}`)).body.workout).toBeNull()
    expect((await bob.get(`/api/dashboard?today=${TODAY}`)).body.workout).toBeNull()
  })

  it("bob can't tick, start, finish or remove anything in alice's workout", async () => {
    const setId = aliceWorkout.exercises[0].sets[0].id
    expect((await bob.patch('/api/sets').send({ setId, completed: true })).status).toBe(404)
    expect((await bob.post('/api/workouts').send({ action: 'start', workoutId: aliceWorkout.id })).status).toBe(404)
    expect((await bob.post('/api/workouts').send({ action: 'complete', workoutId: aliceWorkout.id })).status).toBe(404)
    expect((await bob.post('/api/workouts').send({ action: 'remove', workoutExerciseId: aliceWorkout.exercises[0].id })).status).toBe(404)
    const still = (await alice.get(`/api/workouts?today=${TODAY}`)).body.workout
    expect(still.status).toBe('planned')
    expect(still.exercises[0].sets[0].completed).toBe(false)
  })
})

describe('classes booking', () => {
  it('books, shows my booking, then cancels', async () => {
    const agent = request.agent(app)
    await signup(agent, 'c@pulsefit.com')
    const cls = (await agent.get('/api/classes')).body.classes[0]
    expect((await request(app).post('/api/classes').send({ classId: cls.id })).status).toBe(401)
    const booked = await agent.post('/api/classes').send({ classId: cls.id })
    expect(booked.body.status).toBe('booked')
    const after = (await agent.get('/api/classes')).body.classes.find((c) => c.id === cls.id)
    expect(after).toMatchObject({ myBooking: 'booked', spotsLeft: cls.spotsLeft - 1 })
    expect((await agent.post('/api/classes').send({ classId: cls.id })).body.booked).toBe(false)
  })
})

describe('streak logic (fake dates)', () => {
  const T = '2026-10-14'
  const ago = (n) => addDays(T, -n)
  it('no workouts → 0', () => expect(computeStreak([], T)).toBe(0))
  it('3 days in a row ending today → 3', () => expect(computeStreak([ago(0), ago(1), ago(2)], T)).toBe(3))
  it('a missed day resets it', () => expect(computeStreak([ago(0), ago(2), ago(3)], T)).toBe(1))
  it('today plus yesterday → 2', () => expect(computeStreak([ago(1), ago(0)], T)).toBe(2))
  it('not trained yet today keeps yesterday’s streak alive', () => expect(computeStreak([ago(1), ago(2)], T)).toBe(2))
  it('last workout 2 days ago → 0', () => expect(computeStreak([ago(2), ago(3)], T)).toBe(0))
  it('works across month boundaries and finds the longest streak', () => {
    expect(computeStreak(['2026-10-01', '2026-09-30', '2026-09-29'], '2026-10-01')).toBe(3)
    expect(longestStreak([ago(10), ago(9), ago(8), ago(7), ago(1), ago(0)])).toBe(4)
  })

  it('dashboard streak from real rows', async () => {
    const agent = request.agent(app)
    const me = (await signup(agent, 'streak@pulsefit.com')).body.user
    for (const n of [0, 1, 2, 4]) {
      await db.query(
        `INSERT INTO workouts (user_id, name, workout_date, status, duration_minutes, started_at, completed_at)
         VALUES ($1, 'Seeded', $2, 'completed', 30, now(), now())`,
        [me.id, addDays(TODAY, -n)]
      )
    }
    const { body } = await agent.get(`/api/dashboard?today=${TODAY}`)
    expect(body.streak).toEqual({ current: 3, longest: 3 })
    expect(body.chart.days.map((d) => d.minutes)).toEqual([0, 0, 30, 0, 30, 30, 30])
    expect(body.chart.total).toBe(120)
  })
})

describe('database unreachable', () => {
  it('returns a clear 503 message instead of crashing', async () => {
    const real = globalThis.__pulsefitDb
    globalThis.__pulsefitDb = { query: async () => { throw new Error('fetch failed') } }
    try {
      const res = await request(app).get('/api/stats')
      expect(res.status).toBe(503)
      expect(res.body).toMatchObject({ code: 'db_unavailable', error: expect.stringMatching(/can't reach the PulseFit database/) })
    } finally {
      globalThis.__pulsefitDb = real
    }
  })
})

describe('progress rings', () => {
  it('percent never goes above 100% and never returns NaN', () => {
    expect(percent(5, 4)).toBe(100)
    expect(percent(2, 4)).toBe(50)
    expect(percent(-3, 4)).toBe(0)
    expect(percent(NaN, 4)).toBe(0)
    expect(percent(3, 0)).toBe(0)
    expect(percent(undefined, 150)).toBe(0)
  })

  it('dashboard ring numbers stay within 0–100 when goals are beaten', async () => {
    const agent = request.agent(app)
    const me = (await signup(agent, 'rings@pulsefit.com', { weeklyGoalWorkouts: 1, weeklyGoalMinutes: 10 })).body.user
    for (let i = 0; i < 3; i++) {
      await db.query(
        `INSERT INTO workouts (user_id, name, workout_date, status, duration_minutes, started_at, completed_at)
         VALUES ($1, 'Big day', $2, 'completed', 45, now(), now())`,
        [me.id, TODAY]
      )
    }
    const { body } = await agent.get(`/api/dashboard?today=${TODAY}`)
    expect(body.week).toMatchObject({ workouts: 3, minutes: 135, workoutsPct: 100, minutesPct: 100, goalsHit: 2, goalsTotal: 2 })
    const numbers = JSON.stringify(body).match(/-?\d+(\.\d+)?|NaN|null/g)
    expect(numbers).not.toContain('NaN')
  })
})

describe('newsletter', () => {
  it('saves an email once, rejects bad emails', async () => {
    const ok = await request(app).post('/api/newsletter').send({ email: ' News@PulseFit.com ' })
    expect(ok.status).toBe(200)
    expect(ok.body.message).toMatch(/You're in/)
    expect((await request(app).post('/api/newsletter').send({ email: 'news@pulsefit.com' })).status).toBe(200)
    const rows = await db.query(`SELECT email FROM newsletter_subscribers WHERE email = 'news@pulsefit.com'`)
    expect(rows).toHaveLength(1)
    expect((await request(app).post('/api/newsletter').send({ email: 'nope' })).status).toBe(400)
    expect((await request(app).post('/api/newsletter').send({})).status).toBe(400)
    await db.query(`DELETE FROM newsletter_subscribers WHERE email = 'news@pulsefit.com'`)
  })
})
