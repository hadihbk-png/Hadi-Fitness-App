import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// Minimal history-based router: /, /login, /signup, /dashboard, /library, /workout
const RouterContext = createContext(null)

const current = () => ({ path: window.location.pathname, search: window.location.search, hash: window.location.hash })

function scrollToHash(hash) {
  if (!hash) return window.scrollTo({ top: 0, behavior: 'instant' })
  // Wait a frame so the new page has rendered its sections
  requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }))
}

export function RouterProvider({ children }) {
  const [location, setLocation] = useState(current)

  useEffect(() => {
    const onPop = () => setLocation(current())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to, { replace = false, scroll = true } = {}) => {
    const url = new URL(to, window.location.origin)
    window.history[replace ? 'replaceState' : 'pushState']({}, '', url.pathname + url.search + url.hash)
    setLocation(current())
    if (scroll) scrollToHash(url.hash)
  }, [])

  const value = useMemo(() => ({ ...location, navigate }), [location, navigate])
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export const useRouter = () => useContext(RouterContext)

export function Link({ to, onClick, ...rest }) {
  const { navigate } = useRouter()
  return (
    <a
      href={to}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        navigate(to)
      }}
      {...rest}
    />
  )
}
