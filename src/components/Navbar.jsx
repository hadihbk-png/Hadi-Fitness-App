import { useEffect, useState } from 'react'
import { CalendarDays, Dumbbell, Home, LayoutDashboard, LogIn, LogOut, Play } from 'lucide-react'
import { Logo } from './ui'
import { Link, useRouter } from '../lib/router'
import { firstName, initials, useAuth } from '../lib/auth'

export default function Navbar({ onStart, onLogout }) {
  const [scrolled, setScrolled] = useState(false)
  const { path, hash } = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isActive = (to) => {
    if (to === '/#classes') return path === '/' && hash === '#classes'
    if (to === '/') return path === '/' && hash !== '#classes'
    if (to === '/dashboard') return path === '/dashboard' || path === '/workout'
    return path === to
  }

  const links = user
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/library', label: 'Library' },
        { to: '/#classes', label: 'Classes' },
      ]
    : [
        { to: '/#classes', label: 'Classes' },
        { to: '/login', label: 'Log in' },
      ]

  const tabs = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/library', label: 'Library', icon: Dumbbell },
    null, // Start button
    user ? { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard } : { to: '/login', label: 'Log in', icon: LogIn },
    { to: '/#classes', label: 'Classes', icon: CalendarDays },
  ]

  return (
    <>
      <header className={`navbar ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="container navbar-inner">
          <Logo />
          <nav className="nav-links" aria-label="Primary">
            {links.map(({ to, label }) => (
              <Link key={to} to={to} className={isActive(to) ? 'is-active' : ''}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            {user && (
              <>
                <Link to="/dashboard" className="user-chip" title={`Signed in as ${user.fullName}`}>
                  <span className="avatar" aria-hidden="true">{initials(user.fullName)}</span>
                  <span className="user-name">
                    <span className="sr-only">Signed in as </span>
                    {firstName(user)}
                  </span>
                </Link>
                <button className="icon-btn" onClick={onLogout} aria-label="Log out" title="Log out">
                  <LogOut size={16} />
                </button>
              </>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => onStart()}>
              <Play size={16} fill="currentColor" /> <span>Start</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="tabbar" aria-label="Mobile">
        {tabs.map((tab) =>
          tab ? (
            <Link key={tab.to} to={tab.to} className={isActive(tab.to) ? 'is-active' : ''}>
              <tab.icon size={20} />
              <span>{tab.label}</span>
            </Link>
          ) : (
            <button key="start" className="tabbar-start" onClick={() => onStart()} aria-label="Start your workout">
              <Play size={24} fill="currentColor" />
            </button>
          )
        )}
      </nav>
    </>
  )
}
