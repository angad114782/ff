import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '../components/ui'
import { api } from '../api'
import { useApp } from '../context/AppContext'
import { homeFor } from '../components/RequireRole'
import logo from '../assets/logo/VerticalLogoLockup-White.svg'

export default function Login() {
  const navigate = useNavigate()
  const { login, currentUser, ready, setCurrentUser } = useApp()
  const [mode, setMode] = useState('login') // 'login' | 'forgot' | 'setup'
  const [setupName, setSetupName] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  // First run: with no admin yet, offer the one-time "create admin" step instead of the login form.
  useEffect(() => {
    api.get('/api/auth/setup').then((r) => r?.needsSetup && setMode('setup')).catch(() => {})
  }, [])

  async function handleSetup(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { user } = await api.post('/api/auth/setup', { name: setupName.trim(), email: email.trim(), password })
      setCurrentUser(user)
      navigate(homeFor(user))
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  // Already signed in (e.g. reopened the PWA) — skip the form.
  useEffect(() => {
    if (ready && currentUser) navigate(homeFor(currentUser), { replace: true })
  }, [ready, currentUser, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const user = await login(email.trim(), password)
      navigate(homeFor(user))
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/api/auth/forgot-password', { email: forgotEmail.trim() })
      setForgotSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function backToLogin() {
    setMode('login')
    setForgotEmail('')
    setForgotSent(false)
    setError('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linen px-4 py-12">
      <div className="w-full max-w-sm">
        <div
          className="mx-auto mb-6 flex h-64 w-64 items-center justify-center rounded-t-full bg-terracotta pb-3 shadow-[0_1px_2px_rgba(43,38,32,0.06),0_16px_32px_rgba(178,94,68,0.28)]"
          aria-hidden="true"
        >
          {/* 160px = the brand guide's stated digital minimum for the vertical
              lockup; the surrounding box keeps ~25% clearspace on every side. */}
          <img src={logo} alt="" className="h-40 w-40 object-contain" />
        </div>

        <div
          className="rounded-xl border border-sage-grey bg-linen p-8 shadow-[0_1px_2px_rgba(43,38,32,0.04),0_12px_28px_rgba(43,38,32,0.08)] transition-shadow duration-200"
        >
          <div className="text-center">
            <p className="font-display text-4xl text-terracotta">{mode === 'setup' ? 'Welcome' : 'Welcome back'}</p>
            <p className="mt-2 text-sm text-ink/70">
              {mode === 'setup' ? 'Create the admin account to get started.' : 'Designed for a life well lived.'}
            </p>
          </div>

          {mode === 'setup' ? (
            <form className="mt-8 space-y-4" onSubmit={handleSetup}>
              <Input id="setupName" label="Name" value={setupName} onChange={(e) => setSetupName(e.target.value)} required />
              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="you@fandf.in"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                required
              />
              <Input
                id="password"
                label="Password (8+ characters)"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={error}
                minLength={8}
                required
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create admin'}
              </Button>
            </form>
          ) : mode === 'login' ? (
            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="you@fandf.in"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                error={error}
                required
              />
              <Input
                id="password"
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot')
                    setError('')
                  }}
                  className="text-sm font-medium text-terracotta transition-colors hover:text-terracotta-deep hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Log in'}
              </Button>
            </form>
          ) : (
            <div className="mt-8 space-y-4">
              {forgotSent ? (
                <p className="rounded-lg border border-sage-grey bg-sand/40 p-3 text-sm text-ink">
                  If an account exists for <span className="font-medium">{forgotEmail}</span>, your admin has been
                  notified and will set a new password for you.
                </p>
              ) : (
                <form className="space-y-4" onSubmit={handleForgotSubmit}>
                  <Input
                    id="forgotEmail"
                    label="Email"
                    type="email"
                    placeholder="you@fandf.in"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value)
                      setError('')
                    }}
                    error={error}
                    required
                  />
                  <Button type="submit" className="w-full" disabled={submitting}>
                    Request Password Reset
                  </Button>
                </form>
              )}
              <button
                type="button"
                onClick={backToLogin}
                className="w-full text-center text-sm font-medium text-terracotta transition-colors hover:text-terracotta-deep hover:underline"
              >
                Back to login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
