import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'

// GET `path` on mount and whenever it changes. `reload()` refetches without clearing existing data.
export function useFetch(path) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!path) return
    let cancelled = false
    setLoading(true)
    api
      .get(path)
      .then((json) => {
        if (cancelled) return
        setData(json)
        setError('')
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [path, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, loading, reload, setData }
}
