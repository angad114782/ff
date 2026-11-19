import { Router } from 'express'
import { nextId, now, row, users } from '../db.js'
import { hashPassword } from '../lib/crypto.js'
import { badRequest, notFound } from '../lib/errors.js'
import * as v from '../lib/validate.js'
import { publicUser } from '../middleware/auth.js'

const router = Router()

const find = async (id) => {
  const found = row(await users.findOne({ _id: Number(id), role: 'salesman' }))
  if (!found) throw notFound('Salesman not found.')
  return found
}

function fields(body) {
  return {
    name: v.str(body?.name, 'Name', { max: 100 }),
    email: v.email(body?.email),
    phone: v.str(body?.phone, 'Phone', { max: 30 }),
    branch: v.str(body?.branch, 'Branch', { max: 100 }),
  }
}

const assertEmailFree = async (email, exceptId = 0) => {
  if (await users.findOne({ email, _id: { $ne: exceptId } }, { projection: { _id: 1 } })) {
    throw badRequest('That email is already in use.')
  }
}

router.get('/', async (_req, res) => {
  const found = await users.find({ role: 'salesman' }).collation({ locale: 'en', strength: 2 }).sort({ name: 1 }).toArray()
  res.json({ salesmen: found.map((u) => publicUser(row(u))) })
})

router.post('/', async (req, res) => {
  const f = fields(req.body)
  const password = v.password(req.body?.password)
  await assertEmailFree(f.email)
  const doc = {
    _id: await nextId('users'), ...f, role: 'salesman', active: true,
    password_hash: hashPassword(password), token_version: 0, created_at: now(),
  }
  try {
    await users.insertOne(doc)
  } catch (err) {
    if (err.code === 11000) throw badRequest('That email is already in use.')
    throw err
  }
  res.status(201).json({ salesman: publicUser(row(doc)) })
})

router.put('/:id', async (req, res) => {
  const existing = await find(req.params.id)
  const f = fields(req.body)
  await assertEmailFree(f.email, existing.id)
  await users.updateOne({ _id: existing.id }, { $set: f })
  res.json({ salesman: publicUser(await find(existing.id)) })
})

router.patch('/:id/active', async (req, res) => {
  const existing = await find(req.params.id)
  if (typeof req.body?.active !== 'boolean') throw badRequest('active must be true or false.')
  // Deactivating also bumps token_version so any open session is dropped immediately.
  await users.updateOne({ _id: existing.id }, { $set: { active: req.body.active }, $inc: { token_version: 1 } })
  res.json({ salesman: publicUser(await find(existing.id)) })
})

router.post('/:id/reset-password', async (req, res) => {
  const existing = await find(req.params.id)
  const password = v.password(req.body?.password)
  await users.updateOne({ _id: existing.id }, { $set: { password_hash: hashPassword(password) }, $inc: { token_version: 1 } })
  res.json({ ok: true })
})

export default router
