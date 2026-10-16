import { useState } from 'react'
import { Check, Dumbbell, Play, Plus, Repeat, SearchX, Timer, WifiOff, RefreshCw } from 'lucide-react'
import { MUSCLE_GROUPS } from '../data'
import { api, todayKey } from '../lib/api'
import { useRouter } from '../lib/router'
import { useToast } from '../lib/toast'
import { useApi } from '../lib/useApi'
import { EmptyState, Reveal, SectionHeader, SkeletonCard } from '../components/ui'

const FILTERS = ['All', ...MUSCLE_GROUPS]

export default function Library() {
  const [group, setGroup] = useState('All')
  const { navigate } = useRouter()
  const toast = useToast()
  const exercises = useApi(`/api/exercises${group === 'All' ? '' : `?muscle=${group}`}`)
  const today = useApi(`/api/workouts?today=${todayKey()}`)
  const [busy, setBusy] = useState(() => new Set())

  const workout = today.data?.workout
  const inToday = new Map((workout?.exercises ?? []).map((e) => [e.exerciseId, e.id]))
  const totalSets = (workout?.exercises ?? []).reduce((n, e) => n + e.sets.length, 0)
  const list = exercises.data?.exercises ?? []

  const toggle = async (ex) => {
    const workoutExerciseId = inToday.get(ex.id)
    const adding = !workoutExerciseId
    const before = today.data
    // Optimistic: flip the button straight away
    today.setData((d) => {
      const w = d?.workout ?? { id: null, name: "Today's Workout", status: 'planned', exercises: [] }
      const exercisesNext = adding
        ? [...w.exercises, { id: `tmp-${ex.id}`, exerciseId: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, reps: ex.reps, restSeconds: ex.restSeconds, sets: Array.from({ length: ex.sets }, (_, i) => ({ id: `tmp-${i}`, setNumber: i + 1, completed: false })) }]
        : w.exercises.filter((e) => e.exerciseId !== ex.id)
      return { ...d, workout: { ...w, exercises: exercisesNext } }
    })
    setBusy((s) => new Set(s).add(ex.id))
    try {
      const res = await api('/api/workouts', {
        method: 'POST',
        body: adding ? { action: 'add', exerciseId: ex.id, today: todayKey() } : { action: 'remove', workoutExerciseId, today: todayKey() },
      })
      today.setData({ workout: res.workout, completedToday: res.completedToday })
      toast(res.message)
    } catch (err) {
      today.setData(before)
      toast(err.message, 'error')
    } finally {
      setBusy((s) => {
        const next = new Set(s)
        next.delete(ex.id)
        return next
      })
    }
  }

  return (
    <section className="section page-top" id="library">
      <div className="container">
        <SectionHeader
          eyebrow="Library"
          title="Build today’s"
          accent="workout."
          text="Filter by muscle group, add the moves you want, then hit start. Sets, reps and rest times are all set for you."
        />

        <Reveal className={`today-bar glass ${workout?.exercises.length ? 'has-items' : ''}`}>
          <span className="today-bar-info">
            <span className="empty-icon small-icon"><Dumbbell size={18} /></span>
            {workout?.exercises.length ? (
              <span>
                <strong>{workout.name}</strong>
                <span className="muted small"> · {workout.exercises.length} exercise{workout.exercises.length === 1 ? '' : 's'} · {totalSets} sets</span>
              </span>
            ) : (
              <span className="muted">No workout yet today. Add a few exercises below to build one.</span>
            )}
          </span>
          {workout?.exercises.length > 0 && (
            <button className="btn btn-primary btn-sm btn-glow" onClick={() => navigate('/workout')}>
              <Play size={16} fill="currentColor" /> Start workout
            </button>
          )}
        </Reveal>

        <Reveal className="class-toolbar">
          <span className="class-date"><Dumbbell size={18} /> {group === 'All' ? 'All muscle groups' : group}</span>
          <div className="chips-scroll" role="tablist" aria-label="Muscle group">
            {FILTERS.map((g) => (
              <button key={g} role="tab" aria-selected={group === g} className={`filter-chip ${group === g ? 'is-active' : ''}`} onClick={() => setGroup(g)}>
                {g}
              </button>
            ))}
          </div>
        </Reveal>

        {exercises.loading ? (
          <div className="class-grid" aria-busy="true" aria-label="Loading exercises">
            {Array.from({ length: 8 }, (_, i) => <SkeletonCard key={i} className="class-card" lines={3} />)}
          </div>
        ) : exercises.error ? (
          <EmptyState
            className="glass"
            icon={WifiOff}
            title="Couldn't load the library"
            text={exercises.error.message}
            action={<button className="btn btn-ghost" onClick={() => exercises.reload()}><RefreshCw size={16} /> Try again</button>}
          />
        ) : list.length === 0 ? (
          <EmptyState className="glass" icon={SearchX} title="No exercises here yet" text="Try another muscle group." />
        ) : (
          <div className="class-grid">
            {list.map((ex, i) => {
              const added = inToday.has(ex.id)
              return (
                <Reveal key={`${group}-${ex.id}`} delay={(i % 8) * 50} className={`class-card glass exercise-card mg-${ex.muscleGroup.toLowerCase()} ${added ? 'is-booked' : ''}`}>
                  <div className="class-top">
                    <span className="class-type">{ex.muscleGroup}</span>
                    <span className={`chip diff diff-${ex.difficulty.toLowerCase()}`}>{ex.difficulty}</span>
                  </div>
                  <h3>{ex.name}</h3>
                  <p className="muted small exercise-desc">{ex.description}</p>
                  <div className="exercise-stats">
                    <span><Repeat size={14} /> {ex.sets} × {ex.reps}</span>
                    <span><Timer size={14} /> {ex.restSeconds}s rest</span>
                  </div>
                  <button
                    className={`btn btn-block ${added ? 'btn-booked' : 'btn-primary'}`}
                    onClick={() => toggle(ex)}
                    disabled={busy.has(ex.id) || today.loading}
                    aria-pressed={added}
                  >
                    {added ? (<><Check size={18} strokeWidth={3} /> Added to today</>) : (<><Plus size={18} /> Add to today’s workout</>)}
                  </button>
                </Reveal>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
