import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { Check, Dumbbell, ListChecks, Loader2, Pause, Play, Plus, RefreshCw, RotateCcw, SkipForward, Timer, Trophy, WifiOff, X } from 'lucide-react'
import { DAYS } from '../data'
import { formatTime, useInterval } from '../hooks'
import { api, todayKey } from '../lib/api'
import { useRouter } from '../lib/router'
import { useToast } from '../lib/toast'
import { useApi } from '../lib/useApi'
import { EmptyState, Ring, Skeleton } from '../components/ui'

function celebrate() {
  const shared = { zIndex: 200, disableForReducedMotion: true, colors: ['#c6ff00', '#00e5ff', '#ff8a3d', '#ff3d81', '#ffffff'] }
  confetti({ ...shared, particleCount: 140, spread: 80, origin: { y: 0.65 } })
  setTimeout(() => confetti({ ...shared, particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } }), 220)
  setTimeout(() => confetti({ ...shared, particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } }), 380)
}

// Flip one set's `completed` flag inside the workout payload
const withSet = (data, setId, completed) => ({
  ...data,
  workout: {
    ...data.workout,
    exercises: data.workout.exercises.map((ex) => ({
      ...ex,
      sets: ex.sets.map((s) => (s.id === setId ? { ...s, completed } : s)),
    })),
  },
})

export default function LiveWorkout({ onClose, onFinished }) {
  const { navigate } = useRouter()
  const toast = useToast()
  const { data, setData, error, loading, reload } = useApi(`/api/workouts?today=${todayKey()}`)
  const workout = data?.workout
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(true)
  const [rest, setRest] = useState(0)
  const [restTotal, setRestTotal] = useState(60)
  const [result, setResult] = useState(null)
  const [finishing, setFinishing] = useState(false)
  const started = useRef(false)
  const dialogRef = useRef(null)
  const closeRef = useRef(null)

  const sets = workout?.exercises.flatMap((e) => e.sets) ?? []
  const completed = sets.filter((s) => s.completed).length
  const totalSets = sets.length
  const pct = totalSets ? completed / totalSets : 0
  const active = !!workout && workout.exercises.length > 0 && !result

  // Mark the workout as started (once) and resume the clock if it was already running
  useEffect(() => {
    if (!active || started.current) return
    started.current = true
    if (workout.startedAt) setElapsed(Math.max(0, Math.floor((Date.now() - Date.parse(workout.startedAt)) / 1000)))
    if (workout.status === 'planned') {
      api('/api/workouts', { method: 'POST', body: { action: 'start', workoutId: workout.id } })
        .then((r) => setData((d) => (d?.workout ? { ...d, workout: { ...d.workout, status: r.status, startedAt: r.startedAt } } : d)))
        .catch((err) => toast(err.message, 'error'))
    }
  }, [active, workout, setData, toast])

  useInterval(() => setElapsed((s) => s + 1), active && running ? 1000 : null)
  useInterval(() => setRest((s) => Math.max(0, s - 1)), rest > 0 ? 1000 : null)

  // Keyboard: Escape closes, focus moves into the dialog and stays there, and returns afterwards
  useEffect(() => {
    const opener = document.activeElement
    closeRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose()
      if (e.key !== 'Tab' || !dialogRef.current) return
      const items = dialogRef.current.querySelectorAll('button:not([disabled]), a[href]')
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
      opener?.focus?.({ preventScroll: true })
    }
  }, [onClose])

  const toggleSet = async (ex, set) => {
    const next = !set.completed
    setData((d) => withSet(d, set.id, next)) // optimistic: tick instantly
    if (next) {
      setRestTotal(ex.restSeconds || 60)
      setRest(ex.restSeconds || 60)
    }
    try {
      await api('/api/sets', { method: 'PATCH', body: { setId: set.id, completed: next } })
    } catch (err) {
      setData((d) => withSet(d, set.id, !next))
      if (next) setRest(0)
      toast(`Couldn't save that set. ${err.message}`, 'error')
    }
  }

  const finish = async () => {
    setFinishing(true)
    try {
      const res = await api('/api/workouts', {
        method: 'POST',
        body: { action: 'complete', workoutId: workout.id, durationMinutes: Math.max(1, Math.round(elapsed / 60)) },
      })
      setResult(res)
      setRest(0)
      celebrate()
      toast('Workout saved. Nice work!')
      onFinished?.()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setFinishing(false)
    }
  }

  const goToLibrary = () => navigate('/library')
  const seeProgress = () => navigate('/dashboard#progress')

  let body
  if (loading && !data) {
    body = (
      <div className="session-head" aria-busy="true" aria-label="Loading your workout">
        <Skeleton width="38%" height={12} />
        <Skeleton width="62%" height={30} radius={10} style={{ margin: '12px 0 18px' }} />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={58} radius={16} style={{ marginBottom: 10 }} />
        ))}
      </div>
    )
  } else if (error && !data) {
    body = (
      <EmptyState
        icon={WifiOff}
        title="Couldn't load your workout"
        text={error.message}
        action={<button className="btn btn-ghost" onClick={() => reload()}><RefreshCw size={16} /> Try again</button>}
      />
    )
  } else if (result) {
    body = (
      <div className="session-done">
        <div className="trophy-burst">
          <Trophy size={56} />
        </div>
        <h2>Workout <span className="text-gradient">crushed.</span></h2>
        <p className="muted">{result.name} is saved to your progress. Your streak lives on.</p>
        <div className="done-stats">
          <div><strong>{formatTime(elapsed)}</strong><span>Time</span></div>
          <div><strong>{result.sets.done}/{result.sets.total}</strong><span>Sets</span></div>
          <div><strong>{result.durationMinutes}</strong><span>Minutes</span></div>
        </div>
        <button className="btn btn-primary btn-block" onClick={seeProgress}>
          See my progress
        </button>
      </div>
    )
  } else if (!active) {
    body = (
      <EmptyState
        icon={Dumbbell}
        title="No workout yet today."
        text="Pick one from the Library! Add a few exercises, then come back here to start."
        action={<button className="btn btn-primary btn-glow" onClick={goToLibrary}><Plus size={18} /> Open the Library</button>}
      />
    )
  } else {
    const restEx = rest > 0
    body = (
      <>
        <div className="session-head">
          <span className="eyebrow">{DAYS[(new Date().getDay() + 6) % 7]} · Live session</span>
          <h2>{workout.name}</h2>
          <div className="session-timer">
            <Timer size={18} />
            <strong>{formatTime(elapsed)}</strong>
            <button className="icon-btn" onClick={() => setRunning((r) => !r)} aria-label={running ? 'Pause timer' : 'Resume timer'}>
              {running ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <span className="session-kcal"><ListChecks size={16} /> {completed}/{totalSets} sets</span>
          </div>
          <div
            className="session-progress"
            role="progressbar"
            aria-label={`${completed} of ${totalSets} sets done`}
            aria-valuemin={0}
            aria-valuemax={totalSets}
            aria-valuenow={completed}
          >
            <span style={{ width: `${pct * 100}%` }} />
          </div>
        </div>

        <div className="session-list">
          {workout.exercises.map((ex) => {
            const all = ex.sets.length > 0 && ex.sets.every((s) => s.completed)
            return (
              <div key={ex.id} className={`session-ex ${all ? 'is-complete' : ''}`}>
                <div className="session-ex-info">
                  <strong>{ex.name}</strong>
                  <span className="muted small">{ex.sets.length} × {ex.reps} · {ex.restSeconds}s rest</span>
                </div>
                <div className="sets">
                  {ex.sets.map((s) => (
                    <button
                      key={s.id}
                      className={`set ${s.completed ? 'is-done' : ''}`}
                      onClick={() => toggleSet(ex, s)}
                      aria-pressed={s.completed}
                      aria-label={`${ex.name} set ${s.setNumber}`}
                    >
                      {s.completed ? <Check size={16} strokeWidth={3} /> : s.setNumber}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="session-foot">
          {restEx ? (
            <div className="rest">
              <Ring progress={rest / restTotal} size={64} stroke={6} animate={false} from="#00e5ff" to="#c6ff00">
                <strong className="small">{rest}s</strong>
              </Ring>
              <div>
                <strong>Rest up</strong>
                <span className="muted small">Breathe. Next set loading…</span>
              </div>
              <button className="icon-btn" onClick={() => setRest(restTotal)} aria-label="Restart rest timer"><RotateCcw size={16} /></button>
              <button className="icon-btn" onClick={() => setRest(0)} aria-label="Skip rest"><SkipForward size={16} /></button>
            </div>
          ) : (
            <span className="muted small">Tap a set when you finish it, and the rest timer starts on its own.</span>
          )}
          <button className="btn btn-primary btn-glow" onClick={finish} disabled={completed === 0 || finishing}>
            {finishing ? <Loader2 size={18} className="spin" /> : <Check size={18} strokeWidth={3} />} Finish
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="session glass"
        role="dialog"
        aria-modal="true"
        aria-label={workout ? `${workout.name} session` : 'Live workout'}
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} className="icon-btn session-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
        {body}
      </div>
    </div>
  )
}
