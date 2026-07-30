import { createContext, useContext, useEffect, useState } from 'react'
import { seedLogs, salesmen as seedSalesmen } from '../mock/data'

const AppContext = createContext(null)

const USER_KEY = 'ff_current_user'
const LOGS_KEY = 'ff_activity_logs'
const SALESMEN_KEY = 'ff_salesmen'
const HERO_IMAGES_KEY = 'ff_hero_images'
const UPCOMING_MEDIA_KEY = 'ff_upcoming_pdfs'

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => loadJSON(USER_KEY, null))
  const [logs, setLogs] = useState(() => loadJSON(LOGS_KEY, seedLogs))
  const [salesmen, setSalesmen] = useState(() => loadJSON(SALESMEN_KEY, seedSalesmen))
  const [heroImages, setHeroImages] = useState(() => loadJSON(HERO_IMAGES_KEY, []))
  const [upcomingMedia, setUpcomingMedia] = useState(() => loadJSON(UPCOMING_MEDIA_KEY, []))
  const [storageError, setStorageError] = useState('')

  useEffect(() => {
    if (currentUser) localStorage.setItem(USER_KEY, JSON.stringify(currentUser))
    else localStorage.removeItem(USER_KEY)
  }, [currentUser])

  useEffect(() => {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs))
  }, [logs])

  useEffect(() => {
    localStorage.setItem(SALESMEN_KEY, JSON.stringify(salesmen))
  }, [salesmen])

  // Hero images/PDFs are stored as data URIs, which can be large enough to hit
  // the browser's localStorage quota — this is a mock-data prototype with no
  // real file storage backend, so surface that instead of crashing silently.
  useEffect(() => {
    try {
      localStorage.setItem(HERO_IMAGES_KEY, JSON.stringify(heroImages))
    } catch {
      setStorageError('Could not save — the uploaded images are too large for local storage.')
    }
  }, [heroImages])

  useEffect(() => {
    try {
      localStorage.setItem(UPCOMING_MEDIA_KEY, JSON.stringify(upcomingMedia))
    } catch {
      setStorageError('Could not save — the uploaded file is too large for local storage.')
    }
  }, [upcomingMedia])

  function addLog(entry) {
    setLogs((list) => [{ id: `${Date.now()}-${Math.random()}`, timestamp: new Date().toISOString(), ...entry }, ...list])
  }

  function login(user) {
    setCurrentUser(user)
    // Only salesman activity is tracked in the Logs screen per the product spec.
    if (user.role === 'salesman') {
      addLog({ type: 'login', name: user.name, email: user.email })
    }
  }

  function logout() {
    setCurrentUser(null)
  }

  return (
    <AppContext.Provider
      value={{
        currentUser,
        login,
        logout,
        logs,
        addLog,
        salesmen,
        setSalesmen,
        heroImages,
        setHeroImages,
        upcomingMedia,
        setUpcomingMedia,
        storageError,
        setStorageError,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
