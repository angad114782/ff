import { badRequest } from './errors.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function str(value, field, { min = 1, max = 200, optional = false } = {}) {
  if ((value === undefined || value === null || value === '') && optional) return ''
  if (typeof value !== 'string') throw badRequest(`${field} is required.`)
  const v = value.trim()
  if (v.length < min) throw badRequest(min <= 1 ? `${field} is required.` : `${field} must be at least ${min} characters.`)
  if (v.length > max) throw badRequest(`${field} must be at most ${max} characters.`)
  return v
}

export function email(value) {
  const v = str(value, 'Email', { max: 200 }).toLowerCase()
  if (!EMAIL.test(v)) throw badRequest('Enter a valid email address.')
  return v
}

export function password(value, field = 'Password') {
  if (typeof value !== 'string' || value.length < 8) throw badRequest(`${field} must be at least 8 characters.`)
  if (value.length > 200) throw badRequest(`${field} is too long.`)
  return value
}

export function int(value, fallback, { min = 1, max = 1000 } = {}) {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
