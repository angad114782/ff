import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { db } from '../db.js'
import { hashPassword, verifyPassword } from '../lib/crypto.js'
import { badRequest, unauthorized } from '../lib/errors.js'
import * as v from '../lib/validate.js'
import { endSession, publicUser, requireAuth, sessionUser, startSession } from '../middleware/auth.js'
import { logActivity } from '../services/activity.js'

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
})

// Verified against a throwaway hash when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = hashPassword('not-a-real-password')

router.post('/login', loginLimiter, (req, res) => {
  const email = v.email(req.body?.email)
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)

  const ok = verifyPassword(password, user?.password_hash ?? DUMMY_HASH) && Boolean(user)
  if (!ok) throw unauthorized('Incorrect email or password.')
  if (!user.active) throw unauthorized('This account has been deactivated. Contact your admin.')

  startSession(res, user)
  if (user.role === 'salesman') logActivity({ type: 'login', user })
  res.json({ user: publicUser(user) })
})

router.post('/logout', (_req, res) => {
  endSession(res)
  res.status(204).end()
})

// Not an error when signed out: the client asks on every load, so answer 200 with `user: null`.
router.get('/me', (req, res) => {
  const user = sessionUser(req)
  res.json({ user: user ? publicUser(user) : null })
})

// No email delivery is wired up, so a request is recorded for the admin (Logs → Reset requests)
// who then sets a new password. The response is identical whether or not the account exists.
router.post('/forgot-password', loginLimiter, (req, res) => {
  const email = v.email(req.body?.email)
  const user = db.prepare("SELECT * FROM users WHERE email = ? AND role = 'salesman' AND active = 1").get(email)
  if (user) logActivity({ type: 'reset_request', user })
  res.json({ ok: true })
})

router.put('/profile', requireAuth, (req, res) => {
  const name = v.str(req.body?.name, 'Name', { max: 100 })
  const email = v.email(req.body?.email)
  const phone = v.str(req.body?.phone, 'Phone', { max: 30, optional: true })
  const clash = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id)
  if (clash) throw badRequest('That email is already in use.')
  db.prepare('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?').run(name, email, phone, req.user.id)
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) })
})

router.post('/change-password', requireAuth, (req, res) => {
  if (!verifyPassword(String(req.body?.current ?? ''), req.user.password_hash)) {
    throw badRequest('Current password is incorrect.')
  }
  const next = v.password(req.body?.next, 'New password')
  db.prepare('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?').run(
    hashPassword(next),
    req.user.id,
  )
  // Bumping token_version signed out every session; issue a fresh one for this device.
  startSession(res, db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id))
  res.json({ ok: true })
})

export default router
