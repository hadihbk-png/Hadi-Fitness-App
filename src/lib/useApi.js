import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'

// Load JSON from one of our /api routes. Pass path = null to skip.
export function useApi(path) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(!!path)
  const controller = useRef(null)

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!path) return
      controller.current?.abort()
      const ctrl = (controller.current = new AbortController())
      if (!quiet) setLoading(true)
      try {
        const result = await api(path, { signal: ctrl.signal })
        if (!ctrl.signal.aborted) {
          setData(result)
          setError(null)
        }
      } catch (err) {
        if (err.name !== 'AbortError' && !ctrl.signal.aborted) setError(err)
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    },
    [path]
  )

  useEffect(() => {
    load()
    return () => controller.current?.abort()
  }, [load])

  return { data, setData, error, loading, reload: load }
}
