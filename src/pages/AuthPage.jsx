import { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Logo } from '../components/ui'
import { useAuth } from '../lib/auth'
import { Link, useRouter } from '../lib/router'
import { useToast } from '../lib/toast'

// Only allow redirects back into our own pages
const safeNext = (search) => {
  const next = new URLSearchParams(search).get('next')
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
}

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup'
  const { login, signup } = useAuth()
  const { navigate, search } = useRouter()
  const toast = useToast()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', weeklyGoalWorkouts: 4, weeklyGoalMinutes: 150 })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const user = isSignup
        ? await signup({ ...form, weeklyGoalWorkouts: Number(form.weeklyGoalWorkouts), weeklyGoalMinutes: Number(form.weeklyGoalMinutes) })
        : await login(form.email, form.password)
      toast(isSignup ? `Welcome to PulseFit, ${user.fullName.split(' ')[0]}!` : `Welcome back, ${user.fullName.split(' ')[0]}!`)
      navigate(safeNext(search), { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="hero-glow hero-glow-1" />
      <div className="hero-glow hero-glow-2" />
      <div className="hero-grid" />

      <form className="auth-card glass fade-up" onSubmit={submit} noValidate aria-describedby={error ? 'auth-error' : undefined}>
        <Logo />
        <div>
          <span className="eyebrow">{isSignup ? 'Join free' : 'Welcome back'}</span>
          <h1>
            {isSignup ? 'Start your ' : 'Log in to '}
            <span className="text-gradient">{isSignup ? 'streak.' : 'PulseFit.'}</span>
          </h1>
          <p className="muted">
            {isSignup ? 'Set your weekly goals and we’ll track every rep.' : 'Pick up right where you left off.'}
          </p>
        </div>

        {isSignup && (
          <div className="field">
            <label htmlFor="fullName">Your name</label>
            <input id="fullName" className="input" autoComplete="name" required value={form.fullName} onChange={set('fullName')} placeholder="Alex Morgan" />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" className="input" autoComplete="email" required value={form.email} onChange={set('email')} placeholder="you@email.com" />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            required
            minLength={isSignup ? 8 : undefined}
            value={form.password}
            onChange={set('password')}
            placeholder={isSignup ? 'At least 8 characters, with a number' : '••••••••'}
          />
        </div>

        {isSignup && (
          <fieldset className="field-row">
            <legend className="field-legend">Weekly goals</legend>
            <div className="field">
              <label htmlFor="goalWorkouts">Workouts / week</label>
              <input id="goalWorkouts" type="number" inputMode="numeric" min={1} max={14} className="input" value={form.weeklyGoalWorkouts} onChange={set('weeklyGoalWorkouts')} />
            </div>
            <div className="field">
              <label htmlFor="goalMinutes">Active minutes / week</label>
              <input id="goalMinutes" type="number" inputMode="numeric" min={10} max={3000} step={10} className="input" value={form.weeklyGoalMinutes} onChange={set('weeklyGoalMinutes')} />
            </div>
          </fieldset>
        )}

        {error && (
          <p id="auth-error" className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn-primary btn-lg btn-block btn-glow" disabled={busy}>
          {busy ? <Loader2 size={20} className="spin" /> : <ArrowRight size={20} />}
          {isSignup ? 'Create my account' : 'Log in'}
        </button>

        <p className="muted small auth-switch">
          {isSignup ? 'Already have an account? ' : 'New to PulseFit? '}
          <Link to={`${isSignup ? '/login' : '/signup'}${search}`}>{isSignup ? 'Log in' : 'Create a free account'}</Link>
        </p>
      </form>
    </section>
  )
}
