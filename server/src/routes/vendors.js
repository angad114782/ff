import { Router } from 'express'
import { CI, nextId, now, row, vendors } from '../db.js'
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
  mapping: r.mapping ?? {},
  resolve: r.resolve ?? null,
  active: r.active !== false,
})

const find = async (id) => {
  const found = row(await vendors.findOne({ _id: Number(id) }))
  if (!found) throw notFound('Vendor not found.')
  return found
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

  // Optional first call: search by the item's name to get the vendor's own id, then read stock by that id.
  let resolve = null
  const r = body?.resolve
  if (r && typeof r.url === 'string' && r.url.trim()) {
    const rUrl = v.str(r.url, 'Search address', { max: 500 })
    if (!/^https?:\/\//i.test(rUrl)) throw badRequest('The search address must start with https://')
    const idPath = typeof r.id === 'string' ? r.id.trim() : ''
    const matchPath = typeof r.match === 'string' ? r.match.trim() : ''
    if (!idPath) throw badRequest('Enter the field that holds the vendor id in the search reply.')
    for (const val of [idPath, matchPath]) if (val && !isValidPath(val)) throw badRequest(`"${val}" is not a valid field path.`)
    resolve = { url: rUrl, id: idPath, ...(matchPath ? { match: matchPath } : {}) }
  }

  return {
    name: v.str(body?.name, 'Vendor name', { max: 120 }),
    method,
    url,
    body: v.str(body?.body, 'Body', { max: 5000, optional: true }),
    auth_type: authType,
    auth_name: auth.auth_name,
    auth_secret: auth.auth_secret,
    mapping,
    resolve,
  }
}

const assertNameFree = async (name, exceptId = 0) => {
  if (await vendors.findOne({ name, _id: { $ne: exceptId } }, { collation: CI, projection: { _id: 1 } })) {
    throw badRequest('That vendor already exists.')
  }
}

router.get('/', async (_req, res) => {
  const found = await vendors.find().collation(CI).sort({ name: 1 }).toArray()
  res.json({ vendors: found.map((r) => present(row(r))) })
})

// Vendor names as the primary API reports them (PrimaryVendorName), so the admin picks one instead of
// typing it. Read from the first pages of the primary's items and kept for a few minutes.
let namesCache = { at: 0, names: [] }
router.get('/primary-names', async (_req, res) => {
  if (!(await isConfigured())) return res.json({ names: [], note: 'The primary API is not connected yet.' })
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

router.post('/', async (req, res) => {
  const f = parse(req.body)
  await assertNameFree(f.name)
  const doc = { _id: await nextId('vendors'), ...f, active: true, created_at: now() }
  try {
    await vendors.insertOne(doc)
  } catch (err) {
    if (err.code === 11000) throw badRequest('That vendor already exists.')
    throw err
  }
  res.status(201).json({ vendor: present(row(doc)) })
})

router.put('/:id', async (req, res) => {
  const existing = await find(req.params.id)
  const f = parse(req.body, existing)
  await assertNameFree(f.name, existing.id)
  await vendors.updateOne({ _id: existing.id }, { $set: f })
  res.json({ vendor: present(await find(existing.id)) })
})

router.patch('/:id/active', async (req, res) => {
  const existing = await find(req.params.id)
  if (typeof req.body?.active !== 'boolean') throw badRequest('active must be true or false.')
  await vendors.updateOne({ _id: existing.id }, { $set: { active: req.body.active } })
  res.json({ vendor: present(await find(existing.id)) })
})

router.delete('/:id', async (req, res) => {
  await vendors.deleteOne({ _id: (await find(req.params.id)).id })
  res.status(204).end()
})

// Calls the vendor with the form's current (possibly unsaved) settings and an example item id.
// Returns the fields found in the response (for the mapping pickers) and the normalised preview.
router.post('/test', async (req, res) => {
  const existing = req.body?.id ? await find(req.body.id) : undefined
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
