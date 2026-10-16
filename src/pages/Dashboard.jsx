import { useEffect, useState } from 'react'
import {
  Award, Check, ChevronRight, Dumbbell, Flame, Gauge, ListChecks, Medal, Play, Plus, Quote, RefreshCw,
  Sparkles, Target, Timer, TrendingDown, TrendingUp, Trophy, WifiOff, Zap,
} from 'lucide-react'
import { QUOTES } from '../data'
import { useInView, useInterval } from '../hooks'
import { todayKey } from '../lib/api'
import { firstName, useAuth } from '../lib/auth'
import { Link } from '../lib/router'
import { useApi } from '../lib/useApi'
import { Counter, EmptyState, Reveal, Ring, SectionHeader, SkeletonCard } from '../components/ui'

const clampPct = (p) => Math.min(100, Math.max(0, p || 0))
const shortDate = (key, today) => {
  if (key === today) return 'Today'
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function Dashboard({ refreshKey, onStart }) {
  const { user } = useAuth()
  const { data, error, loading, reload } = useApi(`/api/dashboard?today=${todayKey()}`)

  // Reload after a workout is finished in Live Workout Mode
  useEffect(() => {
    if (refreshKey) reload({ quiet: true })
  }, [refreshKey, reload])

  const name = firstName(user)

  return (
    <>
      <section className="section page-top" id="dashboard">
        <div className="container">
          <SectionHeader
            eyebrow="Dashboard"
            title={`Hey ${name},`}
            accent="let’s train."
            text={
              data
                ? `${data.week.workouts} of ${data.week.goalWorkouts} workouts and ${data.week.minutes} of ${data.week.goalMinutes} active minutes this week.`
                : 'Here’s your week at a glance.'
            }
          />

          {loading && !data ? (
            <div className="workout-layout" aria-busy="true" aria-label="Loading your dashboard">
              <SkeletonCard lines={5} className="workout-card" />
              <div className="program-side">
                {[0, 1, 2].map((i) => <SkeletonCard key={i} lines={1} className="program" />)}
              </div>
            </div>
          ) : error && !data ? (
            <EmptyState
              className="glass"
              icon={WifiOff}
              title="We couldn't load your dashboard"
              text={error.message}
              action={<button className="btn btn-ghost" onClick={() => reload()}><RefreshCw size={16} /> Try again</button>}
            />
          ) : (
            <div className="workout-layout">
              <TodayCard data={data} onStart={onStart} />
              <WeekSide data={data} />
            </div>
          )}
        </div>
      </section>

      {data && (
        <>
          <ProgressSection data={data} />
          <MotivationSection data={data} />
        </>
      )}
    </>
  )
}

function TodayCard({ data, onStart }) {
  const w = data.workout
  if (!w || w.exercises.length === 0) {
    const done = data.completedToday.count > 0
    return (
      <Reveal className="workout-card glass">
        <EmptyState
          icon={done ? Trophy : Dumbbell}
          title={done ? 'Workout done today. Legend.' : 'No workout yet today.'}
          text={
            done
              ? `You logged ${data.completedToday.minutes} active minutes today. Fancy more? Build another session in the Library.`
              : 'Pick one from the Library! Add a few exercises and they’ll show up here, ready to start.'
          }
          action={
            <Link to="/library" className="btn btn-primary btn-glow">
              <Plus size={18} /> {done ? 'Add another workout' : 'Open the Library'}
            </Link>
          }
        />
      </Reveal>
    )
  }

  const totalSets = w.exercises.reduce((n, e) => n + e.sets.length, 0)
  const doneSets = w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0)
  const estMinutes = Math.max(5, Math.round(w.exercises.reduce((n, e) => n + (e.sets.length * (45 + e.restSeconds)) / 60, 0)))
  const groups = [...new Set(w.exercises.map((e) => e.muscleGroup))]

  return (
    <Reveal className="workout-card glass swap-in">
      <div className="workout-head">
        <div>
          <span className="eyebrow">Today · {groups.join(' · ')}</span>
          <h3>{w.name}</h3>
        </div>
        <span className="chip chip-cyan"><Gauge size={14} /> {w.status === 'in_progress' ? 'In progress' : 'Planned'}</span>
      </div>

      <div className="workout-meta">
        <span><Timer size={18} /> ~{estMinutes} min</span>
        <span><Dumbbell size={18} /> {w.exercises.length} moves</span>
        <span><ListChecks size={18} /> {doneSets}/{totalSets} sets</span>
      </div>

      <ol className="exercise-list">
        {w.exercises.map((ex, i) => (
          <li key={ex.id} style={{ animationDelay: `${i * 60}ms` }}>
            <span className="ex-index">{String(i + 1).padStart(2, '0')}</span>
            <span className="ex-name">{ex.name}</span>
            <span className="ex-detail">
              {ex.sets.length} × {ex.reps}
              <em>{ex.restSeconds}s rest</em>
            </span>
          </li>
        ))}
      </ol>

      <div className="workout-actions">
        <button className="btn btn-primary btn-block btn-glow" onClick={onStart}>
          <Play size={18} fill="currentColor" /> {w.status === 'in_progress' ? 'Resume' : 'Start'} {w.name}
        </button>
        <Link to="/library" className="btn btn-ghost">
          <Plus size={18} /> Add exercises
        </Link>
      </div>
    </Reveal>
  )
}

function WeekSide({ data }) {
  const { week, streak } = data
  const items = [
    { title: 'Weekly workouts', meta: `${week.workouts} of ${week.goalWorkouts} done`, pct: week.workoutsPct, tone: 'lime' },
    { title: 'Active minutes', meta: `${week.minutes} of ${week.goalMinutes} min`, pct: week.minutesPct, tone: 'cyan' },
    { title: 'Road to 7-Day Fire', meta: `${streak.current}-day streak · best ${streak.longest}`, pct: Math.round((Math.min(7, streak.current) / 7) * 100), tone: 'violet' },
  ]
  return (
    <div className="program-side">
      {items.map((p, i) => (
        <Reveal key={p.title} delay={i * 90} className={`program glass tone-${p.tone}`}>
          <div>
            <h4>{p.title}</h4>
            <span className="muted small">{p.meta}</span>
          </div>
          <div className="program-bar"><span style={{ '--w': `${clampPct(p.pct)}%` }} /></div>
          <span className="program-pct">{p.pct}% <ChevronRight size={16} /></span>
        </Reveal>
      ))}
    </div>
  )
}

function ProgressSection({ data }) {
  const { week, chart, recent, totals, streak, today } = data
  const max = Math.max(60, ...chart.days.map((d) => d.minutes))
  const rings = [
    { label: 'Workouts', icon: Dumbbell, value: week.workouts, goal: week.goalWorkouts, caption: `${week.workoutsPct}% of ${week.goalWorkouts} this week`, from: '#c6ff00', to: '#7dff6a' },
    { label: 'Minutes', icon: Timer, value: week.minutes, goal: week.goalMinutes, caption: `${week.minutesPct}% of ${week.goalMinutes} min`, from: '#00e5ff', to: '#4d7cff' },
    { label: 'Goals hit', icon: Target, value: week.goalsHit, goal: week.goalsTotal, caption: `${week.goalsHit} of ${week.goalsTotal} weekly goals`, from: '#ff8a3d', to: '#ff3d81' },
  ]

  return (
    <section id="progress" className="section">
      <div className="container">
        <SectionHeader eyebrow="Track" title="Progress you can" accent="see." text="Close your rings, watch the minutes climb and keep the streak alive." />

        <div className="progress-grid">
          <Reveal className="glass card rings-card">
            <div className="card-head">
              <h3>This week’s rings</h3>
              <span className="chip chip-lime">Live</span>
            </div>
            <div className="rings-row">
              {rings.map(({ label, icon: Icon, value, goal, caption, from, to }) => (
                <div key={label} className="ring-stat">
                  <Ring progress={goal > 0 ? value / goal : 0} size={112} stroke={10} from={from} to={to}>
                    <Icon size={18} style={{ color: from }} />
                    <strong><Counter value={value} /></strong>
                  </Ring>
                  <span className="ring-label">{label}</span>
                  <span className="muted small">{caption}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={100} className="glass card chart-card">
            <div className="card-head">
              <div>
                <h3>Active minutes</h3>
                <span className="muted small">Last 7 days</span>
              </div>
              <div className="chart-total">
                <strong><Counter value={chart.total} /></strong>
                {chart.changePct === null ? (
                  <span className="muted small">min</span>
                ) : chart.changePct >= 0 ? (
                  <span className="up"><TrendingUp size={14} /> {chart.changePct}%</span>
                ) : (
                  <span className="down"><TrendingDown size={14} /> {Math.abs(chart.changePct)}%</span>
                )}
              </div>
            </div>
            <ChartBars days={chart.days} max={max} />
          </Reveal>

          <Reveal delay={150} className="glass card records-card">
            <div className="card-head">
              <h3><Trophy size={20} className="lime" /> Recent workouts</h3>
              <span className="muted small">{totals.workouts} total</span>
            </div>
            {recent.length === 0 ? (
              <p className="muted small empty-inline">Your finished workouts will show up here. Your first one is the hardest — go get it!</p>
            ) : (
              <ul className="records">
                {recent.map((r, i) => (
                  <li key={r.id}>
                    <span className="record-medal" style={{ animationDelay: `${i * 0.4}s` }}><Award size={18} /></span>
                    <span className="record-lift">{r.name}<small className="muted record-date">{shortDate(r.date, today)}</small></span>
                    <strong><Counter value={r.minutes} /> <small>min</small></strong>
                    <span className="record-delta">{r.sets} sets</span>
                  </li>
                ))}
              </ul>
            )}
          </Reveal>

          <Reveal delay={200} className="glass card volume-card">
            <span className="muted small">Active minutes · this week</span>
            <strong className="volume-big"><Counter value={week.minutes} suffix=" min" duration={2200} /></strong>
            <p className="muted small">
              {week.minutes >= week.goalMinutes ? 'Weekly minutes goal smashed. Keep stacking.' : `${week.goalMinutes - week.minutes} min to go to hit your goal.`}
            </p>
            <div className="volume-split">
              <div><span>Workouts</span><strong>{week.workouts}</strong></div>
              <div><span>Streak</span><strong>{streak.current}d</strong></div>
              <div><span>All time</span><strong>{totals.workouts}</strong></div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function ChartBars({ days, max }) {
  const [ref, inView] = useInView(0.3)
  return (
    <div ref={ref} className={`bars ${inView ? 'is-in' : ''}`}>
      {days.map((d, i) => (
        <div key={d.date} className={`bar-col ${i === 6 ? 'is-today' : ''}`}>
          <span className="bar-value">{d.minutes}</span>
          <div className="bar-track">
            <span className="bar" style={{ '--h': `${(d.minutes / max) * 100}%`, transitionDelay: `${i * 70}ms` }} />
          </div>
          <span className="bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function MotivationSection({ data }) {
  const { week, streak, totals, completedToday } = data
  const [q, setQ] = useState(0)
  // Auto-rotate, but pause while the card is hovered/focused and never for reduced-motion users (WCAG 2.2.2)
  const [paused, setPaused] = useState(false)
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  useInterval(() => setQ((n) => (n + 1) % QUOTES.length), paused || reducedMotion ? null : 6000)
  const trainedToday = completedToday.count > 0

  const goals = [
    { name: `Hit ${week.goalWorkouts} workouts this week`, progress: week.workouts / week.goalWorkouts, detail: `${week.workouts} / ${week.goalWorkouts} workouts`, reward: 'Goal Crusher' },
    { name: `Move ${week.goalMinutes} minutes this week`, progress: week.minutes / week.goalMinutes, detail: `${week.minutes} / ${week.goalMinutes} min`, reward: '+1 goal' },
    { name: '30-Workout Club', progress: totals.workouts / 30, detail: `${Math.min(totals.workouts, 30)} / 30 workouts`, reward: '30 Workouts badge' },
  ]

  const badges = [
    { icon: Trophy, label: 'First Workout', earned: totals.workouts >= 1 },
    { icon: Flame, label: '7-Day Fire', earned: streak.longest >= 7 },
    { icon: Zap, label: 'Cardio Hero', earned: totals.cardioWorkouts >= 1 },
    { icon: Target, label: 'Goal Crusher', earned: week.goalsHit === week.goalsTotal },
    { icon: Medal, label: '30 Workouts', earned: totals.workouts >= 30 },
    { icon: Award, label: '100 Workouts', earned: totals.workouts >= 100 },
  ]

  return (
    <section id="motivation" className="section">
      <div className="container">
        <SectionHeader eyebrow="Stay motivated" title="Momentum is a" accent="habit." text="Streaks, goals and badges that make showing up the easy part." />

        <div className="motivation-grid">
          <Reveal className="glass card streak-card">
            <div className="streak-flame">
              <Flame size={44} />
            </div>
            <strong className="streak-num"><Counter value={streak.current} /></strong>
            <span className="streak-label">day streak</span>
            <div className="streak-week">
              {week.days.map((d) => (
                <div key={d.date} className={`streak-day ${d.done ? 'is-lit' : ''} ${d.isToday ? 'is-today' : ''}`}>
                  <span>{d.done ? <Check size={14} strokeWidth={3} /> : ''}</span>
                  <small>{d.label[0]}</small>
                </div>
              ))}
            </div>
            <p className="muted small">
              {trainedToday ? 'Today is locked in. Legend.' : streak.current > 0 ? 'Train today to keep the fire alive.' : 'Finish a workout to light your first flame.'}
            </p>
          </Reveal>

          <Reveal delay={100} className="glass card challenges-card">
            <div className="card-head">
              <h3><Target size={20} className="cyan" /> Weekly goals</h3>
            </div>
            <ul className="challenges">
              {goals.map((c) => (
                <li key={c.name}>
                  <div className="challenge-top">
                    <strong>{c.name}</strong>
                    <span className="chip chip-ghost"><Sparkles size={12} /> {c.reward}</span>
                  </div>
                  <div className="challenge-bar"><span style={{ '--w': `${clampPct(c.progress * 100)}%` }} /></div>
                  <span className="muted small">{c.detail}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal
            delay={150}
            className="glass card quote-card"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            <Quote size={36} className="quote-mark" />
            <blockquote key={q} className="swap-in">
              <p>{QUOTES[q].text}</p>
              <cite>{QUOTES[q].by}</cite>
            </blockquote>
            <div className="quote-dots">
              {QUOTES.map((_, i) => (
                <button key={i} className={i === q ? 'is-active' : ''} onClick={() => setQ(i)} aria-label={`Quote ${i + 1}`} />
              ))}
            </div>
          </Reveal>

          <Reveal delay={200} className="glass card badges-card">
            <div className="card-head">
              <h3><Medal size={20} className="lime" /> Badges</h3>
              <span className="muted small">{badges.filter((b) => b.earned).length} / {badges.length}</span>
            </div>
            <div className="badges">
              {badges.map(({ icon: Icon, label, earned }) => (
                <div key={label} className={`badge ${earned ? 'is-earned' : ''}`}>
                  <span><Icon size={22} /></span>
                  <small>{label}</small>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
