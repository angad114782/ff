import { Router } from 'express'
import { db } from '../db.js'
import { hashPassword } from '../lib/crypto.js'
import { badRequest, notFound } from '../lib/errors.js'
import * as v from '../lib/validate.js'
import { publicUser } from '../middleware/auth.js'

const router = Router()

const find = (id) => {
  const row = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'salesman'").get(Number(id))
  if (!row) throw notFound('Salesman not found.')
  return row
}

function fields(body) {
  return {
    name: v.str(body?.name, 'Name', { max: 100 }),
    email: v.email(body?.email),
    phone: v.str(body?.phone, 'Phone', { max: 30 }),
    branch: v.str(body?.branch, 'Branch', { max: 100 }),
  }
}

const assertEmailFree = (email, exceptId = 0) => {
  if (db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, exceptId)) {
    throw badRequest('That email is already in use.')
  }
}

router.get('/', (_req, res) => {
  const rows = db.prepare("SELECT * FROM users WHERE role = 'salesman' ORDER BY name").all()
  res.json({ salesmen: rows.map(publicUser) })
})

router.post('/', (req, res) => {
  const f = fields(req.body)
  const password = v.password(req.body?.password)
  assertEmailFree(f.email)
  const { lastInsertRowid } = db
    .prepare("INSERT INTO users (name, email, phone, branch, role, password_hash) VALUES (?, ?, ?, ?, 'salesman', ?)")
    .run(f.name, f.email, f.phone, f.branch, hashPassword(password))
  res.status(201).json({ salesman: publicUser(find(lastInsertRowid)) })
})

router.put('/:id', (req, res) => {
  const existing = find(req.params.id)
  const f = fields(req.body)
  assertEmailFree(f.email, existing.id)
  db.prepare('UPDATE users SET name = ?, email = ?, phone = ?, branch = ? WHERE id = ?').run(
    f.name, f.email, f.phone, f.branch, existing.id,
  )
  res.json({ salesman: publicUser(find(existing.id)) })
})

router.patch('/:id/active', (req, res) => {
  const existing = find(req.params.id)
  if (typeof req.body?.active !== 'boolean') throw badRequest('active must be true or false.')
  // Deactivating also bumps token_version so any open session is dropped immediately.
  db.prepare('UPDATE users SET active = ?, token_version = token_version + 1 WHERE id = ?').run(
    req.body.active ? 1 : 0,
    existing.id,
  )
  res.json({ salesman: publicUser(find(existing.id)) })
})

router.post('/:id/reset-password', (req, res) => {
  const existing = find(req.params.id)
  const password = v.password(req.body?.password)
  db.prepare('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?').run(
    hashPassword(password),
    existing.id,
  )
  res.json({ ok: true })
})

export default router
