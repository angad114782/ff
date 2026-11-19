import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { createFirstAdmin, hasAdmin, row, users } from '../db.js'
import { hashPassword, verifyPassword } from '../lib/crypto.js'
import { badRequest, forbidden, unauthorized } from '../lib/errors.js'
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

router.post('/login', loginLimiter, async (req, res) => {
  const email = v.email(req.body?.email)
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const user = row(await users.findOne({ email }))

  const ok = verifyPassword(password, user?.password_hash ?? DUMMY_HASH) && Boolean(user)
  if (!ok) throw unauthorized('Incorrect email or password.')
  if (!user.active) throw unauthorized('This account has been deactivated. Contact your admin.')

  startSession(res, user)
  if (user.role === 'salesman') await logActivity({ type: 'login', user })
  res.json({ user: publicUser(user) })
})

// First run: until an admin exists, the site offers a one-time "create admin" step. It closes for good
// as soon as an admin account exists.
const setupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false })

router.get('/setup', async (_req, res) => res.json({ needsSetup: !(await hasAdmin()) }))

router.post('/setup', setupLimiter, async (req, res) => {
  const name = v.str(req.body?.name, 'Name', { max: 100 })
  const email = v.email(req.body?.email)
  const password = v.password(req.body?.password)
  const admin = await createFirstAdmin({ name, email, password })
  if (!admin) throw forbidden('Setup is already complete. Sign in instead.')
  startSession(res, admin)
  res.status(201).json({ user: publicUser(admin) })
})

router.post('/logout', (_req, res) => {
  endSession(res)
  res.status(204).end()
})

// Not an error when signed out: the client asks on every load, so answer 200 with `user: null`.
router.get('/me', async (req, res) => {
  const user = await sessionUser(req)
  res.json({ user: user ? publicUser(user) : null })
})

// No email delivery is wired up, so a request is recorded for the admin (Logs → Reset requests)
// who then sets a new password. The response is identical whether or not the account exists.
router.post('/forgot-password', loginLimiter, async (req, res) => {
  const email = v.email(req.body?.email)
  const user = row(await users.findOne({ email, role: 'salesman', active: true }))
  if (user) await logActivity({ type: 'reset_request', user })
  res.json({ ok: true })
})

router.put('/profile', requireAuth, async (req, res) => {
  const name = v.str(req.body?.name, 'Name', { max: 100 })
  const email = v.email(req.body?.email)
  const phone = v.str(req.body?.phone, 'Phone', { max: 30, optional: true })
  if (await users.findOne({ email, _id: { $ne: req.user.id } }, { projection: { _id: 1 } })) throw badRequest('That email is already in use.')
  await users.updateOne({ _id: req.user.id }, { $set: { name, email, phone } })
  res.json({ user: publicUser(row(await users.findOne({ _id: req.user.id }))) })
})

router.post('/change-password', requireAuth, async (req, res) => {
  if (!verifyPassword(String(req.body?.current ?? ''), req.user.password_hash)) {
    throw badRequest('Current password is incorrect.')
  }
  const next = v.password(req.body?.next, 'New password')
  await users.updateOne({ _id: req.user.id }, { $set: { password_hash: hashPassword(next) }, $inc: { token_version: 1 } })
  // Bumping token_version signed out every session; issue a fresh one for this device.
  startSession(res, row(await users.findOne({ _id: req.user.id })))
  res.json({ ok: true })
})

export default router
