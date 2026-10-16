import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null) // connection problems while checking the session

  const refresh = useCallback(async () => {
    // The server sets a harmless pf_logged_in=1 cookie next to the real (httpOnly) session cookie
    if (!document.cookie.split('; ').includes('pf_logged_in=1')) {
      setUser(null)
      setError(null)
      setLoading(false)
      return
    }
    try {
      const { user } = await api('/api/auth/me')
      setUser(user)
      setError(null)
    } catch (err) {
      setUser(null)
      setError(err.status === 401 ? null : err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (email, password) => {
    const { user } = await api('/api/auth/login', { method: 'POST', body: { email, password } })
    setUser(user)
    setError(null)
    return user
  }, [])

  const signup = useCallback(async (fields) => {
    const { user } = await api('/api/auth/signup', { method: 'POST', body: fields })
    setUser(user)
    setError(null)
    return user
  }, [])

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, error, refresh, login, signup, logout }), [user, loading, error, refresh, login, signup, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

export const firstName = (user) => user?.fullName?.trim().split(/\s+/)[0] ?? ''
export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
