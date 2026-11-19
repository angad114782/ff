import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../api'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [ready, setReady] = useState(false) // false until the existing session has been checked

  useEffect(() => {
    api
      .get('/api/auth/me')
      .then(({ user }) => setCurrentUser(user ?? null))
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  useEffect(() => {
    const onUnauthorized = () => setCurrentUser(null)
    window.addEventListener('ff:unauthorized', onUnauthorized)
    return () => window.removeEventListener('ff:unauthorized', onUnauthorized)
  }, [])

  const login = useCallback(async (email, password) => {
    const { user } = await api.post('/api/auth/login', { email, password })
    setCurrentUser(user)
    return user
  }, [])

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout').catch(() => {})
    setCurrentUser(null)
  }, [])

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser, ready, login, logout }}>{children}</AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
