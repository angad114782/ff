import { Navigate, Outlet } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export const homeFor = (user) => (user.role === 'admin' ? '/admin' : '/salesman')

// Route guard. The server enforces access too; this just keeps people off screens they can't use.
export default function RequireRole({ role, children }) {
  const { currentUser, ready } = useApp()
  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center bg-linen text-sm text-ink/60">Loading…</div>
  }
  if (!currentUser) return <Navigate to="/" replace />
  if (currentUser.role !== role) return <Navigate to={homeFor(currentUser)} replace />
  return children ?? <Outlet />
}
