import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { db } from '../db.js'
import { forbidden, unauthorized } from '../lib/errors.js'

export const COOKIE = 'ff_session'

export function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, branch: u.branch, active: Boolean(u.active) }
}

export function startSession(res, user) {
  const token = jwt.sign({ sub: user.id, v: user.token_version }, config.jwtSecret, {
    expiresIn: `${config.sessionHours}h`,
  })
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: config.sessionHours * 3600 * 1000,
    path: '/',
  })
}

export function endSession(res) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, path: '/' })
}

// Resolves the session cookie to a user, or null. Loads the user fresh from the DB on every
// request, so deactivation, role changes and password resets (token_version bump) take
// effect immediately.
export function sessionUser(req) {
  const token = req.cookies?.[COOKIE]
  if (!token) return null
  let payload
  try {
    payload = jwt.verify(token, config.jwtSecret)
  } catch {
    return null
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub)
  return user && user.active && user.token_version === payload.v ? user : null
}

export function requireAuth(req, _res, next) {
  const user = sessionUser(req)
  if (!user) return next(unauthorized(req.cookies?.[COOKIE] ? 'Session expired. Please sign in again.' : undefined))
  req.user = user
  next()
}

export const requireRole = (role) => (req, _res, next) =>
  req.user?.role === role ? next() : next(forbidden())
