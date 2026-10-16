import { useState } from 'react'
import { Calendar, CalendarX, Check, Clock, MapPin, RefreshCw, Users, Zap } from 'lucide-react'
import { DAYS } from '../data'
import { EmptyState, Reveal, SectionHeader, SkeletonCard } from './ui'
import { api } from '../lib/api'
import { initials, useAuth } from '../lib/auth'
import { useRouter } from '../lib/router'
import { useToast } from '../lib/toast'
import { useApi } from '../lib/useApi'

const TYPE_ORDER = ['HIIT', 'Strength', 'Yoga', 'Spin', 'Boxing']

const parseLocal = (s) => {
  const [d, t = '00:00'] = s.split('T')
  const [y, m, day] = d.split('-').map(Number)
  const [h, min] = t.split(':').map(Number)
  return new Date(y, m - 1, day, h, min)
}
const when = (startsAt) => {
  const d = parseLocal(startsAt)
  return `${DAYS[(d.getDay() + 6) % 7]} ${startsAt.slice(11, 16)}`
}
function weekLabel(weekStart) {
  if (!weekStart) return 'This week'
  const start = parseLocal(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `This week · ${fmt(start)} – ${fmt(end)}`
}

export default function Classes() {
  const [filter, setFilter] = useState('All')
  const { user } = useAuth()
  const { navigate } = useRouter()
  const toast = useToast()
  // Re-fetch when the logged-in user changes so "Booked" reflects their own bookings
  const { data, setData, error, loading, reload } = useApi(`/api/classes?for=${user?.id ?? 'guest'}`)
  const [pending, setPending] = useState(null)

  const classes = data?.classes ?? []
  const types = ['All', ...TYPE_ORDER.filter((t) => classes.some((c) => c.category === t)), ...new Set(classes.map((c) => c.category).filter((t) => !TYPE_ORDER.includes(t)))]
  const list = classes.filter((c) => filter === 'All' || c.category === filter)

  const toggle = async (c) => {
    if (!user) {
      toast('Create a free account to book classes')
      return navigate('/signup')
    }
    const before = data
    const cancelling = !!c.myBooking
    // Optimistic update so the button responds instantly
    setData((d) => ({
      ...d,
      classes: d.classes.map((x) =>
        x.id !== c.id
          ? x
          : cancelling
            ? { ...x, myBooking: null, spotsLeft: x.myBooking === 'booked' ? x.spotsLeft + 1 : x.spotsLeft }
            : { ...x, myBooking: x.spotsLeft > 0 ? 'booked' : 'waitlisted', spotsLeft: Math.max(0, x.spotsLeft - 1) }
      ),
    }))
    setPending(c.id)
    try {
      const res = await api('/api/classes', { method: 'POST', body: { classId: c.id } })
      toast(res.message)
      reload({ quiet: true })
    } catch (err) {
      setData(before)
      toast(err.message, 'error')
    } finally {
      setPending(null)
    }
  }

  return (
    <section id="classes" className="section">
      <div className="container">
        <SectionHeader
          eyebrow="Book"
          title="Classes that"
          accent="bring the heat."
          text="Grab a spot in seconds. Our coaches handle the playlist and the pain."
        />

        <Reveal className="class-toolbar">
          <span className="class-date"><Calendar size={18} /> {weekLabel(data?.weekStart)}</span>
          <div className="chips-scroll" role="tablist" aria-label="Class type">
            {types.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={filter === t}
                className={`filter-chip ${filter === t ? 'is-active' : ''}`}
                onClick={() => setFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </Reveal>

        {loading && !data ? (
          <div className="class-grid" aria-busy="true" aria-label="Loading classes">
            {Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} className="class-card" lines={3} />)}
          </div>
        ) : error && !data ? (
          <EmptyState
            className="glass"
            icon={CalendarX}
            title="Couldn't load classes"
            text={error.message}
            action={<button className="btn btn-ghost" onClick={() => reload()}><RefreshCw size={16} /> Try again</button>}
          />
        ) : list.length === 0 ? (
          <EmptyState className="glass" icon={CalendarX} title="No classes scheduled" text="Check back soon — new classes drop every week." />
        ) : (
          <div className="class-grid">
            {list.map((c, i) => {
              const isBooked = !!c.myBooking
              const waitlisted = c.myBooking === 'waitlisted'
              const full = c.spotsLeft === 0 && !isBooked
              const fill = Math.min(1, 1 - c.spotsLeft / c.capacity)
              return (
                <Reveal key={`${filter}-${c.id}`} delay={i * 60} className={`class-card glass type-${c.category.toLowerCase()} ${isBooked ? 'is-booked' : ''}`}>
                  <div className="class-top">
                    <span className="class-type">{c.category}</span>
                    <span className="class-time"><Clock size={14} /> {when(c.startsAt)}</span>
                  </div>
                  <h3>{c.title}</h3>
                  <div className="class-coach">
                    <span className="avatar">{initials(c.coach)}</span>
                    <div>
                      <strong>{c.coach}</strong>
                      <span className="muted small"><MapPin size={12} /> {c.room} · {c.duration} min</span>
                    </div>
                  </div>
                  <div className="class-intensity" role="img" aria-label={`Intensity ${c.intensity} of 3`}>
                    {[1, 2, 3].map((n) => (
                      <Zap key={n} size={16} className={n <= c.intensity ? 'on' : ''} fill={n <= c.intensity ? 'currentColor' : 'none'} />
                    ))}
                    <span className="muted small">{['', 'Chill', 'Moderate', 'Intense'][c.intensity]}</span>
                  </div>
                  <div className="spots">
                    <div className="spots-bar"><span style={{ width: `${fill * 100}%` }} /></div>
                    <span className="muted small">
                      <Users size={12} /> {waitlisted ? 'On the waitlist' : full ? 'Waitlist only' : `${c.spotsLeft} spots left`}
                    </span>
                  </div>
                  <button
                    className={`btn btn-block ${isBooked ? 'btn-booked' : full ? 'btn-ghost' : 'btn-primary'}`}
                    onClick={() => toggle(c)}
                    disabled={pending === c.id}
                  >
                    {isBooked ? (<><Check size={18} strokeWidth={3} /> Booked</>) : full ? 'Join waitlist' : 'Book spot'}
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
