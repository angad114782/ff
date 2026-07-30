import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '../components/ui'
import { adminProfile } from '../mock/data'
import { useApp } from '../context/AppContext'
import logo from '../assets/logo/VerticalLogoLockup-White.svg'

export default function Login() {
  const navigate = useNavigate()
  const { login, salesmen } = useApp()
  const [mode, setMode] = useState('login') // 'login' | 'forgot'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    const normalized = email.trim().toLowerCase()

    // TODO: replace with a real POST /api/auth/login once the Express backend exists —
    // the server should look up the account and return its role, not the client.
    if (normalized === adminProfile.email.toLowerCase()) {
      login({ name: adminProfile.name, email: adminProfile.email, role: 'admin' })
      navigate('/admin')
      return
    }
    const salesman = salesmen.find((s) => s.email.toLowerCase() === normalized)
    if (salesman) {
      if (!salesman.active) {
        setError('This account has been deactivated. Contact your admin.')
        return
      }
      login({ name: salesman.name, email: salesman.email, role: 'salesman', branch: salesman.branch })
      navigate('/salesman')
      return
    }
    setError('No account found for this email.')
  }

  function handleForgotSubmit(e) {
    e.preventDefault()
    // TODO: replace with a real POST /api/auth/forgot-password once the backend exists —
    // always show the same message regardless of match, to avoid leaking which emails exist.
    setForgotSent(true)
  }

  function backToLogin() {
    setMode('login')
    setForgotEmail('')
    setForgotSent(false)
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
            <p className="font-display text-4xl text-terracotta">Welcome back</p>
            <p className="mt-2 text-sm text-ink/70">Designed for a life well lived.</p>
          </div>

          {mode === 'login' ? (
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
                  onClick={() => setMode('forgot')}
                  className="text-sm font-medium text-terracotta transition-colors hover:text-terracotta-deep hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Button type="submit" className="w-full">
                Log in
              </Button>
            </form>
          ) : (
            <div className="mt-8 space-y-4">
              {forgotSent ? (
                <p className="rounded-lg border border-sage-grey bg-sand/40 p-3 text-sm text-ink">
                  If an account exists for <span className="font-medium">{forgotEmail}</span>, a password reset
                  link has been sent.
                </p>
              ) : (
                <form className="space-y-4" onSubmit={handleForgotSubmit}>
                  <Input
                    id="forgotEmail"
                    label="Email"
                    type="email"
                    placeholder="you@fandf.in"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                  <Button type="submit" className="w-full">
                    Send Reset Link
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
