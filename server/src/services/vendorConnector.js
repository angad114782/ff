// Generic vendor-API connector. Every vendor answers in its own shape, so instead of one adapter per
// vendor in code, each vendor row stores (a) how to call it and (b) a mapping from its response to
// one normalised result:  { total, breakdown: [{ label, qty }], po: { qty, expected } }.
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { CI, row, vendors } from '../db.js'
import { memoAsync } from '../lib/memo.js'
import { TOKEN_TYPES, applyAuth } from './vendorAuth.js'

const TIMEOUT_MS = 20_000
const MAX_BYTES = 25_000_000 // some vendors return their whole catalogue in one reply
const NONE = { status: 'not_configured', stock: null, breakdown: [], po: null }

// ---------- response mapping ----------

const PATH = /^([\w$-]+|\[\d+\])(\.[\w$-]+|\[\d+\])*$/
export const isValidPath = (p) => typeof p === 'string' && PATH.test(p)

// Reads "data.items[0].qty" from parsed JSON.
export function getPath(obj, path) {
  if (!path) return undefined
  let cur = obj
  for (const part of path.match(/[^.[\]]+/g) ?? []) {
    if (cur === null || typeof cur !== 'object') return undefined
    cur = cur[part]
  }
  return cur
}

const toNum = (v) => {
  if (v === null || v === undefined || v === '' || typeof v === 'object') return null
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}
const toText = (v) => (v === null || v === undefined || typeof v === 'object' ? null : String(v).trim() || null)

// mapping: { total, list, label, location, qty, poQty, poExpected } — all optional dot-paths.
// `label`/`qty` are relative to each element of `list`. `list` may also be an object like
// { "Delhi": 10, "Mumbai": 4 }, in which case keys are the labels. `$` means the response itself is the list.
// `match` (e.g. "items[0].id") is for vendors that list many items: only rows whose field equals the
// item's external id are kept, and every other path then reads from those rows.
export function normalize(rawJson, mapping = {}, externalItemId) {
  const { json, matched } = keepMatchingRows(rawJson, mapping.match, externalItemId)
  let breakdown = []
  const list = mapping.list === '$' ? json : mapping.list ? getPath(json, mapping.list) : null
  if (Array.isArray(list)) {
    breakdown = list.map((el) => ({
      label: toText(getPath(el, mapping.label)) ?? '—',
      qty: toNum(getPath(el, mapping.qty)),
      ...(mapping.location ? { location: toText(getPath(el, mapping.location)) } : {}),
    }))
  } else if (list && typeof list === 'object') {
    breakdown = Object.entries(list).map(([label, v]) => ({
      label,
      qty: toNum(mapping.qty ? getPath(v, mapping.qty) : v),
    }))
  }
  breakdown = breakdown.filter((b) => b.qty !== null)

  let stock = toNum(getPath(json, mapping.total))
  if (stock === null && breakdown.length) stock = Math.round(breakdown.reduce((s, b) => s + b.qty, 0) * 100) / 100

  const poQty = toNum(getPath(json, mapping.poQty))
  const poExpected = toText(getPath(json, mapping.poExpected))
  const po = poQty !== null || poExpected ? { qty: poQty, expected: poExpected } : null

  const img = toText(getPath(json, mapping.image))
  const image = img && /^https:\/\//i.test(img) ? img : null

  return { stock, breakdown, po, image, ...(matched === null ? {} : { matched }) }
}

export function keepMatchingRows(json, match, externalItemId) {
  const i = match ? match.lastIndexOf('[0].') : -1
  if (i === -1 || externalItemId === undefined) return { json, matched: null }

  const listPath = match.slice(0, i)
  const rel = match.slice(i + 4)
  const rows = listPath ? getPath(json, listPath) : json
  if (!Array.isArray(rows)) return { json, matched: false }

  const wanted = String(externalItemId).trim().toLowerCase()
  const kept = rows.filter((row) => String(getPath(row, rel) ?? '').trim().toLowerCase() === wanted)
  if (!listPath) return { json: kept, matched: kept.length > 0 }

  const copy = structuredClone(json)
  const parts = listPath.match(/[^.[\]]+/g)
  const parent = parts.slice(0, -1).reduce((cur, part) => cur?.[part], copy)
  parent[parts.at(-1)] = kept
  return { json: copy, matched: kept.length > 0 }
}

// Every readable path in a sample response, so the admin can pick fields from a list instead of typing them.
export function listPaths(json, limit = 300) {
  const out = []
  const walk = (value, path, depth) => {
    if (out.length >= limit || depth > 7) return
    if (Array.isArray(value)) {
      if (path) out.push({ path, kind: 'list' })
      if (value.length) walk(value[0], `${path}[0]`, depth + 1)
    } else if (value && typeof value === 'object') {
      const vals = Object.values(value)
      if (path && vals.length && vals.every((v) => toNum(v) !== null)) out.push({ path, kind: 'list' })
      for (const [k, v] of Object.entries(value)) {
        if (/^[\w$-]+$/.test(k)) walk(v, path ? `${path}.${k}` : k, depth + 1)
      }
    } else if (path) {
      out.push({ path, kind: 'value', sample: String(value ?? '').slice(0, 60), numeric: toNum(value) !== null })
    }
  }
  walk(json, '', 0)
  return out
}

// ---------- calling the vendor ----------

const isPrivateV4 = (ip) => {
  const [a, b] = ip.split('.').map(Number)
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
}
const isPrivateIp = (ip) => {
  if (isIP(ip) === 4) return isPrivateV4(ip)
  const v = ip.toLowerCase()
  if (v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return true
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  return mapped ? isPrivateV4(mapped[1]) : false
}

// Admins enter these URLs, but the server makes the request — keep it away from internal addresses.
export async function assertSafeUrl(raw) {
  let u
  try {
    u = new URL(raw)
  } catch {
    throw new Error('The API URL is not valid.')
  }
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('The API URL must start with https://')
  const host = u.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('Internal addresses are not allowed.')
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => [])
  if (!addrs.length) throw new Error('Could not find that website address.')
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error('Internal addresses are not allowed.')
}

const ID_TOKEN = /\{\{\s*externalItemId\s*\}\}/g

async function buildRequest(v, externalItemId, { force = false } = {}) {
  const url = new URL(v.url.replace(ID_TOKEN, encodeURIComponent(externalItemId)))
  const headers = { Accept: 'application/json' }
  await applyAuth(v, url, headers, { force })

  const init = { method: v.method, headers }
  if (v.method === 'POST') {
    headers['Content-Type'] = 'application/json'
    init.body = (v.body || '{}').replace(ID_TOKEN, JSON.stringify(externalItemId).slice(1, -1))
  }
  return { url: url.toString(), init }
}

// Returns the vendor's parsed JSON, or throws an Error with a message fit to show an admin.
// A rejected login token is renewed once before giving up.
export async function callVendor(v, externalItemId) {
  await assertSafeUrl(v.url.replace(ID_TOKEN, 'x'))
  for (let attempt = 0; ; attempt++) {
    const { url, init } = await buildRequest(v, externalItemId, { force: attempt > 0 })
    let res
    try {
      res = await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS) })
    } catch {
      throw new Error('The vendor API did not respond.')
    }
    const denied = res.status === 401 || res.status === 403
    if (denied && attempt === 0 && TOKEN_TYPES.has(v.auth_type)) continue
    if (denied) throw new Error('The vendor API refused the login details.')
    if (!res.ok) throw new Error(`The vendor API returned an error (${res.status}).`)
    const text = await res.text()
    if (text.length > MAX_BYTES) throw new Error('The vendor response is too large.')
    try {
      return unwrapEnvelope(JSON.parse(text))
    } catch {
      throw new Error('The vendor API did not return JSON.')
    }
  }
}

// Some APIs (Business Central OData) answer { "value": "<the real JSON, as a string>" }.
// Hand back the real JSON so its fields can be picked like any other reply.
function unwrapEnvelope(json) {
  if (typeof json?.value === 'string' && /^\s*[[{]/.test(json.value)) {
    try {
      return JSON.parse(json.value)
    } catch {
      /* not JSON after all: keep the reply as it came */
    }
  }
  return json
}

// ---------- used by the stock route ----------

// A reply that carries no stock often says why ("SKU CODE NOT FOUND ...") under a message-like key.
function vendorMessage(json) {
  if (!json || typeof json !== 'object') return null
  for (const [k, v] of Object.entries(json)) {
    if (/^(result_?msg|message|msg|error|error_?message|detail|description)$/i.test(k) && typeof v === 'string' && v.trim()) {
      return v.trim().slice(0, 200)
    }
  }
  return null
}

// Two-step vendors: the first call finds the vendor's own id for the item (by name), the second reads
// stock by that id. Ids don't change, so they are remembered for 10 minutes.
export const resolveId = memoAsync(
  async (v, externalItemId) => {
    const r = v.resolve
    const json = await callVendor({ ...v, method: 'GET', body: '', url: r.url }, externalItemId)
    const { json: kept } = keepMatchingRows(json, r.match, externalItemId)
    const id = getPath(kept, r.id)
    if (id === undefined || id === null || typeof id === 'object') {
      throw new Error(`could not find item "${externalItemId}" at the vendor.`)
    }
    return String(id)
  },
  { ttlMs: 600_000, keyOf: (v, id) => `${v.id}|${v.url}|${JSON.stringify(v.resolve)}|${id}`, cacheable: () => true },
)

// A vendor whose address and body never mention the item returns the same catalogue for every item,
// so one copy is shared for 15 minutes instead of re-downloading it on each search.
const sharedReply = memoAsync((v) => callVendor(v), {
  ttlMs: 900_000,
  max: 20,
  keyOf: (v) => `${v.id}|${v.url}|${v.body ?? ''}|${v.updated_at ?? ''}`,
  cacheable: () => true,
})
const callVendorForStock = (v, itemId) =>
  /\{\{\s*externalItemId\s*\}\}/.test(`${v.url}${v.body ?? ''}`) ? callVendor(v, itemId) : sharedReply(v)

async function fetchVendorStock(vendorName, externalItemId) {
  const name = (vendorName ?? '').trim()
  if (!name || !externalItemId) return NONE
  const v = row(await vendors.findOne({ name, active: { $ne: false } }, { collation: CI }))
  if (!v) return NONE

  const failed = (why) => ({ status: 'error', stock: null, breakdown: [], po: null, message: `${name}: ${why}` })
  try {
    const itemId = v.resolve ? await resolveId(v, externalItemId) : externalItemId
    const json = await callVendorForStock(v, itemId)
    const result = normalize(json, v.mapping ?? {}, itemId)
    if (result.stock === null && !result.breakdown.length) {
      return failed(vendorMessage(json) ?? `no stock was returned for item "${externalItemId}".`)
    }
    return { status: 'ok', ...result }
  } catch (err) {
    console.warn(`vendor lookup failed (${name}): ${err.message}`)
    return failed(err.message)
  }
}

// Vendors are the slowest hop, so repeat lookups (list -> detail, rescans) are served from a 60 s cache.
// Errors and "not configured" are never cached, so a fixed vendor setup works immediately.
export const lookupVendor = memoAsync(fetchVendorStock, {
  ttlMs: 60_000,
  keyOf: (name, id) => `${(name ?? '').trim()}|${String(id ?? '').trim()}`,
  cacheable: (r) => r.status === 'ok',
})
