import { Router } from 'express'
import { db } from '../db.js'
import { badRequest, notFound } from '../lib/errors.js'
import * as v from '../lib/validate.js'
import { callVendor, isValidPath, listPaths, normalize, resolveId } from '../services/vendorConnector.js'
import { isConfigured, searchStock } from '../services/bcApiService.js'
import { AUTH_TYPES, packAuth, publicAuth } from '../services/vendorAuth.js'

const router = Router()

const MAPPING_KEYS = ['match', 'total', 'list', 'label', 'location', 'qty', 'poQty', 'poExpected', 'image']

const present = (r) => ({
  id: r.id,
  name: r.name,
  method: r.method,
  url: r.url,
  body: r.body,
  authType: r.auth_type,
  ...publicAuth(r),
  hasSecret: Boolean(r.auth_secret),
  mapping: JSON.parse(r.mapping),
  active: Boolean(r.active),
})

const find = (id) => {
  const row = db.prepare('SELECT * FROM vendors WHERE id = ?').get(Number(id))
  if (!row) throw notFound('Vendor not found.')
  return row
}

function parse(body, existing) {
  const url = v.str(body?.url, 'API URL', { max: 500 })
  if (!/^https?:\/\//i.test(url)) throw badRequest('The API URL must start with https://')
  try {
    new URL(url.replace(/\{\{\s*externalItemId\s*\}\}/g, 'x'))
  } catch {
    throw badRequest('The API URL is not valid.')
  }
  const method = body?.method === 'POST' ? 'POST' : 'GET'
  const authType = AUTH_TYPES.includes(body?.authType) ? body.authType : 'none'

  const mapping = {}
  for (const k of MAPPING_KEYS) {
    const val = typeof body?.mapping?.[k] === 'string' ? body.mapping[k].trim() : ''
    if (val && !isValidPath(val)) throw badRequest(`"${val}" is not a valid field path.`)
    if (val) mapping[k] = val
  }

  const auth = packAuth(authType, body, existing)

  return {
    name: v.str(body?.name, 'Vendor name', { max: 120 }),
    method,
    url,
    body: v.str(body?.body, 'Body', { max: 5000, optional: true }),
    auth_type: authType,
    auth_name: auth.auth_name,
    auth_secret: auth.auth_secret,
    mapping,
    resolve: existing?.resolve ?? '',
  }
}

const assertNameFree = (name, exceptId = 0) => {
  if (db.prepare('SELECT id FROM vendors WHERE name = ? AND id != ?').get(name, exceptId)) {
    throw badRequest('That vendor already exists.')
  }
}

router.get('/', (_req, res) => {
  res.json({ vendors: db.prepare('SELECT * FROM vendors ORDER BY name').all().map(present) })
})

// Vendor names as the primary API reports them (PrimaryVendorName), so the admin picks one instead of
// typing it. Read from the first pages of the primary's items and kept for a few minutes.
let namesCache = { at: 0, names: [] }
router.get('/primary-names', async (_req, res) => {
  if (!isConfigured()) return res.json({ names: [], note: 'The primary API is not connected yet.' })
  if (Date.now() - namesCache.at > 5 * 60_000) {
    const found = new Set()
    try {
      for (let pageNo = 1; pageNo <= 10; pageNo++) {
        const rows = await searchStock({ pageNo, pageSize: 50 })
        for (const r of rows) if (typeof r.PrimaryVendorName === 'string' && r.PrimaryVendorName.trim()) found.add(r.PrimaryVendorName.trim())
        if (rows.length < 50) break
      }
    } catch (err) {
      if (!found.size) return res.json({ names: [], note: 'Could not read vendor names from the primary API.' })
    }
    namesCache = { at: Date.now(), names: [...found].sort((a, b) => a.localeCompare(b)) }
  }
  res.json({ names: namesCache.names })
})

router.post('/', (req, res) => {
  const f = parse(req.body)
  assertNameFree(f.name)
  const { lastInsertRowid } = db
    .prepare('INSERT INTO vendors (name, method, url, body, auth_type, auth_name, auth_secret, mapping) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(f.name, f.method, f.url, f.body, f.auth_type, f.auth_name, f.auth_secret, JSON.stringify(f.mapping))
  res.status(201).json({ vendor: present(find(lastInsertRowid)) })
})

router.put('/:id', (req, res) => {
  const existing = find(req.params.id)
  const f = parse(req.body, existing)
  assertNameFree(f.name, existing.id)
  db.prepare('UPDATE vendors SET name = ?, method = ?, url = ?, body = ?, auth_type = ?, auth_name = ?, auth_secret = ?, mapping = ?, resolve = ? WHERE id = ?')
    .run(f.name, f.method, f.url, f.body, f.auth_type, f.auth_name, f.auth_secret, JSON.stringify(f.mapping), f.resolve, existing.id)
  res.json({ vendor: present(find(existing.id)) })
})

router.patch('/:id/active', (req, res) => {
  const existing = find(req.params.id)
  if (typeof req.body?.active !== 'boolean') throw badRequest('active must be true or false.')
  db.prepare('UPDATE vendors SET active = ? WHERE id = ?').run(req.body.active ? 1 : 0, existing.id)
  res.json({ vendor: present(find(existing.id)) })
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM vendors WHERE id = ?').run(find(req.params.id).id)
  res.status(204).end()
})

// Calls the vendor with the form's current (possibly unsaved) settings and an example item id.
// Returns the fields found in the response (for the mapping pickers) and the normalised preview.
router.post('/test', async (req, res) => {
  const existing = req.body?.id ? find(req.body.id) : undefined
  const f = parse(req.body, existing)
  const externalItemId = v.str(req.body?.externalItemId, 'External Item ID', { max: 100 })
  try {
    const itemId = f.resolve ? await resolveId(f, externalItemId) : externalItemId
    const json = await callVendor(f, itemId)
    res.json({ ok: true, paths: listPaths(json), preview: normalize(json, f.mapping, itemId) })
  } catch (err) {
    res.json({ ok: false, error: err.message })
  }
})

export default router
