import { ArrowRight, Dumbbell, Flame, HeartPulse, Play, Timer, TrendingUp, Trophy } from 'lucide-react'
import { Counter, Ring, Skeleton, compact } from './ui'
import { PREVIEW_WORKOUT } from '../data'

const STAT_LABELS = [
  ['members', 'Members'],
  ['workoutsCompleted', 'Workouts completed'],
  ['classesThisWeek', 'Classes this week'],
]

// The phone on the right is an illustration of the app; the stats underneath are live from /api/stats.
export default function Hero({ onStart, stats, statsError }) {
  const todayWorkout = PREVIEW_WORKOUT
  return (
    <section id="top" className="hero">
      <div className="hero-glow hero-glow-1" />
      <div className="hero-glow hero-glow-2" />
      <div className="hero-grid" />

      <div className="container hero-inner">
        <div className="hero-copy">
          <span className="pill fade-up" style={{ animationDelay: '0ms' }}>
            <span className="pill-dot" /> New: Autumn strength programs are live
          </span>
          <h1 className="fade-up" style={{ animationDelay: '80ms' }}>
            Train smarter.
            <br />
            <span className="text-gradient">Get stronger.</span>
          </h1>
          <p className="hero-sub fade-up" style={{ animationDelay: '160ms' }}>
            PulseFit plans your week, tracks every rep, books your favourite classes and keeps you showing up.
            Your whole gym life, in your pocket.
          </p>
          <div className="hero-ctas fade-up" style={{ animationDelay: '240ms' }}>
            <button className="btn btn-primary btn-lg btn-glow" onClick={() => onStart()}>
              <Play size={20} fill="currentColor" /> Start Your Workout
            </button>
            <a href="#classes" className="btn btn-ghost btn-lg">
              Book a class <ArrowRight size={18} />
            </a>
          </div>

          <div className="hero-stats fade-up" style={{ animationDelay: '320ms' }} aria-busy={!stats && !statsError}>
            {STAT_LABELS.map(([key, label]) => (
              <div key={key}>
                <strong>
                  {stats ? <Counter {...compact(stats[key])} /> : statsError ? '—' : <Skeleton width={56} height={26} radius={8} />}
                </strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-visual fade-up" style={{ animationDelay: '200ms' }}>
          <div className="phone glass">
            <div className="phone-top">
              <div>
                <span className="muted small">Today</span>
                <h2>{todayWorkout.title}</h2>
              </div>
              <span className="chip chip-lime"><Dumbbell size={14} /> {todayWorkout.level}</span>
            </div>

            <div className="phone-ring">
              <Ring progress={0.68} size={190} stroke={14}>
                <Flame className="ring-icon" size={22} />
                <strong className="ring-big"><Counter value={todayWorkout.kcal} /></strong>
                <span className="muted small">kcal goal</span>
              </Ring>
            </div>

            <div className="pulse-card">
              <div className="pulse-head">
                <HeartPulse size={18} className="beat" />
                <span><strong>142</strong> bpm</span>
                <span className="muted small">Zone 4 · Threshold</span>
              </div>
              <svg className="pulse-line" viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 32 H60 L72 32 L80 12 L92 52 L102 22 L110 32 H170 L182 32 L190 8 L202 56 L212 20 L220 32 H300" />
              </svg>
            </div>

            <div className="phone-metrics">
              <div><Timer size={16} /><strong>{todayWorkout.minutes}m</strong><span>Duration</span></div>
              <div><Dumbbell size={16} /><strong>{todayWorkout.exercises}</strong><span>Exercises</span></div>
              <div><Trophy size={16} /><strong>3</strong><span>PRs/week</span></div>
            </div>
          </div>

          <div className="float-chip float-chip-1 glass">
            <span className="float-icon lime"><TrendingUp size={18} /></span>
            <div><strong>+12%</strong><span>Strength this month</span></div>
          </div>
          <div className="float-chip float-chip-2 glass">
            <span className="float-icon orange"><Flame size={18} /></span>
            <div><strong>21-day</strong><span>Streak on fire</span></div>
          </div>
        </div>
      </div>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k}>
              STRENGTH <i>✦</i> HIIT <i>✦</i> YOGA <i>✦</i> SPIN <i>✦</i> BOXING <i>✦</i> MOBILITY <i>✦</i> RECOVERY <i>✦</i>
              STRENGTH <i>✦</i> HIIT <i>✦</i> YOGA <i>✦</i> SPIN <i>✦</i> BOXING <i>✦</i> MOBILITY <i>✦</i> RECOVERY <i>✦</i>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
