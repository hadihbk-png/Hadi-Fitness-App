import { useCallback, useEffect, useState } from 'react'
import { Compass, RefreshCw, WifiOff } from 'lucide-react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Classes from './components/Classes'
import Footer from './components/Footer'
import { EmptyState, SkeletonCard } from './components/ui'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import Library from './pages/Library'
import LiveWorkout from './pages/LiveWorkout'
import { isConnectionProblem } from './lib/api'
import { AuthProvider, useAuth } from './lib/auth'
import { Link, RouterProvider, useRouter } from './lib/router'
import { ToastProvider, useToast } from './lib/toast'
import { useApi } from './lib/useApi'

export default function App() {
  return (
    <RouterProvider>
      <ToastProvider>
        <AuthProvider>
          <Shell />
        </AuthProvider>
      </ToastProvider>
    </RouterProvider>
  )
}

const PROTECTED = ['/dashboard', '/library', '/workout']

function Shell() {
  const { path, navigate } = useRouter()
  const { user, loading, error, logout, refresh } = useAuth()
  const toast = useToast()
  const [dashboardVersion, setDashboardVersion] = useState(0)
  const stats = useApi(path === '/' ? '/api/stats' : null)

  // "Start Your Workout": sign up when logged out, Dashboard when logged in
  const start = useCallback(() => navigate(user ? '/dashboard' : '/signup'), [navigate, user])
  const startLive = useCallback(() => navigate('/workout', { scroll: false }), [navigate])
  const closeLive = useCallback(() => navigate('/dashboard', { scroll: false }), [navigate])
  const finished = useCallback(() => setDashboardVersion((v) => v + 1), [])

  const doLogout = async () => {
    await logout()
    toast('You’re logged out. See you next session!')
    navigate('/')
  }

  // Route guards
  useEffect(() => {
    if (loading) return
    if (!user && !error && PROTECTED.includes(path)) navigate(`/login?next=${encodeURIComponent(path)}`, { replace: true })
    if (user && (path === '/login' || path === '/signup')) navigate('/dashboard', { replace: true })
  }, [loading, user, error, path, navigate])

  let page
  if (PROTECTED.includes(path)) {
    if (loading || (!user && !error)) page = <PageSkeleton />
    else if (!user) page = <ConnectionProblem error={error} onRetry={refresh} />
    else if (path === '/library') page = <Library />
    else
      page = (
        <>
          <Dashboard refreshKey={dashboardVersion} onStart={startLive} />
          {path === '/workout' && <LiveWorkout onClose={closeLive} onFinished={finished} />}
        </>
      )
  } else if (path === '/login' || path === '/signup') {
    page = <AuthPage key={path} mode={path.slice(1)} />
  } else if (path === '/') {
    page = (
      <>
        <Hero onStart={start} stats={stats.data} statsError={stats.error} />
        <Classes />
      </>
    )
  } else {
    page = <NotFound />
  }

  const showFooter = path !== '/login' && path !== '/signup'

  return (
    <>
      <Navbar onStart={start} onLogout={doLogout} />
      {isConnectionProblem(error) && (
        <div className="db-banner glass" role="alert">
          <WifiOff size={18} className="pink" />
          <span>{error.message}</span>
          <button className="btn btn-ghost btn-sm" onClick={refresh}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}
      <main>{page}</main>
      {showFooter && <Footer onStart={start} />}
    </>
  )
}

function PageSkeleton() {
  return (
    <section className="section page-top" aria-busy="true" aria-label="Loading">
      <div className="container">
        <div className="workout-layout">
          <SkeletonCard lines={5} className="workout-card" />
          <div className="program-side">
            {[0, 1, 2].map((i) => <SkeletonCard key={i} lines={1} className="program" />)}
          </div>
        </div>
      </div>
    </section>
  )
}

function ConnectionProblem({ error, onRetry }) {
  return (
    <section className="section page-top">
      <div className="container">
        <EmptyState
          className="glass"
          icon={WifiOff}
          title="We can't reach PulseFit right now"
          text={error?.message}
          action={<button className="btn btn-primary" onClick={onRetry}><RefreshCw size={16} /> Try again</button>}
        />
      </div>
    </section>
  )
}

function NotFound() {
  return (
    <section className="section page-top">
      <div className="container">
        <EmptyState
          className="glass"
          icon={Compass}
          title="This page skipped leg day."
          text="We couldn't find what you were looking for."
          action={<Link to="/" className="btn btn-primary">Back to home</Link>}
        />
      </div>
    </section>
  )
}
