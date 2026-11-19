import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'ff-test-'))
process.env.DATA_DIR = dir
process.env.DB_FILE = join(dir, 'test.db')
process.env.ADMIN_EMAIL = 'admin@test.in'
process.env.ADMIN_PASSWORD = 'admin-pass-123'
process.env.CLIENT_DIST = join(dir, 'no-client')

const SAMPLE_ROWS = [
  {
    itemNo: 'FF-0042458', itemName: 'SAN MARINO-BEIGE', collectionCode: 'F CHENOVA', itemFamily: 'STOCK',
    mrp: 797.0, UOM: 'MTR', QtySO: 1.3, QtyPO: 50.0, QtyFree: 114.52, Color: 'GOLD', PurchasePrices: 220.0,
    VendorGroup: 'CR-DOM-SUP', PrimaryVendorName: 'TEE GEE FABRICS', ExternalItemId: 'LM073-33', ContactNo: '9810710123',
    qrCode: 'https://scan.fandf.in/D0SS',
    lots: [
      { lotNo: '241336', locationCode: 'FFDH', lotEntryCount: 1, quantity: 10.65 },
      { lotNo: '247319', locationCode: 'FFDH', lotEntryCount: 1, quantity: 28.95 },
      { lotNo: '1', locationCode: 'FFDH', lotEntryCount: 1, quantity: 3.32 },
      { lotNo: '247320', locationCode: 'FFMUM', lotEntryCount: 1, quantity: 72.9 },
    ],
    Transport: 'SM COURIER', BiltyNo: 'READY BY 30-10-26', BiltyDate: '', DeliveryStatus: 'UNDER PRODUCTION', DeliveryDate: '11/10/26',
  },
  { itemNo: 'FF-0042473', itemName: 'SAN MARINO-OLIVE', QtyFree: -33.12, QtySO: 35.28, lots: [{ lotNo: 'x', locationCode: 'FFMUM', quantity: 2.16 }] },
]

const realFetch = globalThis.fetch
const bcCalls = []
globalThis.fetch = async (url, init) => {
  const u = String(url)
  if (u.includes('login.microsoftonline.com')) {
    const ok = String(init.body).includes('client_secret=good-secret')
    return ok
      ? Response.json({ access_token: 'tok', expires_in: 3600 })
      : Response.json({ error: 'invalid_client' }, { status: 401 })
  }
  if (u.includes('businesscentral.dynamics.com')) {
    const body = JSON.parse(init.body)
    bcCalls.push({ url: u, body })
    const hits = SAMPLE_ROWS.filter(
      (r) => (body.searchText && (r.itemName.includes(body.searchText) || r.itemNo.toLowerCase() === body.searchText.toLowerCase())) || (body.qrCode && r.qrCode === body.qrCode),
    )
    // BC double-encodes: { value: "<json string>" }
    return Response.json({ '@odata.context': 'x', value: JSON.stringify({ value: hits }) })
  }
  if (u.startsWith('https://203.0.113.10/')) {
    // A vendor with its own response shape, and a bearer token we can check.
    if (init.headers.Authorization !== 'Bearer vendor-token') return new Response('no', { status: 401 })
    return Response.json({ data: { warehouses: [{ city: 'Surat', free: '120.5' }, { city: 'Delhi', free: 30 }], eta: '2026-11-10' } })
  }
  if (u.startsWith('https://203.0.113.20/')) {
    // Log in first, then use the token the login returns.
    if (u.endsWith('/auth/login')) {
      const ok = JSON.parse(init.body).password === 'pw'
      return ok ? Response.json({ token: 'login-token', actor: {} }) : new Response('no', { status: 401 })
    }
    if (init.headers.Authorization !== 'Bearer login-token') return new Response('no', { status: 401 })
    return Response.json({ data: { availability: { current_available_meters: '95.700', lot_stock: [{ location_code: 'X-49', available_meters: '95.7' }] } } })
  }
  return realFetch(url, init)
}

let server, base
const jar = {}

async function call(path, { method = 'GET', body, as = 'admin', headers = {} } = {}) {
  const res = await realFetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(jar[as] ? { Cookie: jar[as] } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) jar[as] = setCookie.split(';')[0]
  const json = res.status === 204 ? null : await res.json().catch(() => null)
  return { status: res.status, json }
}

before(async () => {
  const { createApp } = await import('../src/app.js')
  await new Promise((resolve) => {
    server = createApp().listen(0, resolve)
  })
  base = `http://127.0.0.1:${server.address().port}`
})

after(() => {
  server.close()
  globalThis.fetch = realFetch
  rmSync(dir, { recursive: true, force: true })
})

test('requires auth', async () => {
  assert.equal((await call('/api/stock/search?q=SAN', { as: 'anon' })).status, 401)
  assert.equal((await call('/api/admin/stats', { as: 'anon' })).status, 401)
})

test('login: wrong password rejected, right password sets session', async () => {
  assert.equal((await call('/api/auth/login', { method: 'POST', body: { email: 'admin@test.in', password: 'nope' }, as: 'x' })).status, 401)
  const ok = await call('/api/auth/login', { method: 'POST', body: { email: 'ADMIN@test.in', password: 'admin-pass-123' } })
  assert.equal(ok.status, 200)
  assert.equal(ok.json.user.role, 'admin')
  assert.equal((await call('/api/auth/me')).json.user.email, 'admin@test.in')
})

test('salesman lifecycle: create, login, deactivate kills session', async () => {
  const created = await call('/api/admin/salesmen', {
    method: 'POST',
    body: { name: 'Rohit', email: 'rohit@test.in', phone: '1', branch: 'Gurgaon', password: 'rohit-pass-1' },
  })
  assert.equal(created.status, 201)
  const id = created.json.salesman.id
  assert.equal((await call('/api/admin/salesmen', { method: 'POST', body: { name: 'Dup', email: 'rohit@test.in', phone: '1', branch: 'x', password: 'password-1' } })).status, 400)

  const login = await call('/api/auth/login', { method: 'POST', body: { email: 'rohit@test.in', password: 'rohit-pass-1' }, as: 'sales' })
  assert.equal(login.status, 200)
  assert.equal((await call('/api/admin/stats', { as: 'sales' })).status, 403, 'salesman must not reach admin routes')
  assert.equal((await call('/api/auth/me', { as: 'sales' })).status, 200)

  await call(`/api/admin/salesmen/${id}/active`, { method: 'PATCH', body: { active: false } })
  assert.equal((await call('/api/auth/me', { as: 'sales' })).json.user, null, 'deactivation must drop the live session')
  assert.equal((await call('/api/stock/search?q=x', { as: 'sales' })).status, 401)
  assert.equal((await call('/api/auth/login', { method: 'POST', body: { email: 'rohit@test.in', password: 'rohit-pass-1' }, as: 'sales2' })).status, 401)

  await call(`/api/admin/salesmen/${id}/active`, { method: 'PATCH', body: { active: true } })
  await call(`/api/admin/salesmen/${id}/reset-password`, { method: 'POST', body: { password: 'brand-new-pass' } })
  assert.equal((await call('/api/auth/login', { method: 'POST', body: { email: 'rohit@test.in', password: 'brand-new-pass' }, as: 'sales' })).status, 200)
})

test('BC config: secret is write-only and never returned', async () => {
  const res = await call('/api/admin/config/bc', {
    method: 'PUT',
    body: { tenantId: 'tenant-1', environment: 'PRODUCTION', clientId: 'cid', clientSecret: 'good-secret' },
  })
  assert.equal(res.status, 200)
  assert.equal(res.json.hasClientSecret, true)
  assert.ok(!JSON.stringify(res.json).includes('good-secret'))
  assert.equal(res.json.odataRoot, 'https://api.businesscentral.dynamics.com/v2.0/tenant-1/PRODUCTION/ODataV4')

  const bad = await call('/api/admin/config/bc', { method: 'PUT', body: { tenantId: '../evil' } })
  assert.equal(bad.status, 400)

  // Blank secret keeps the stored one.
  await call('/api/admin/config/bc', { method: 'PUT', body: { clientSecret: '' } })
  assert.equal((await call('/api/admin/config/bc/test', { method: 'POST' })).json.ok, true)
})

test('search: double-encoded BC response is parsed, scans use qrCode, salesman searches are logged', async () => {
  const r = await call('/api/stock/search?q=SAN%20MARINO', { as: 'sales' })
  assert.equal(r.status, 200)
  assert.equal(r.json.items.length, 2)
  assert.equal(r.json.items[0].code, 'FF-0042458')
  assert.equal(r.json.items[1].status, 'out_of_stock')
  assert.match(bcCalls.at(-1).url, /company=F%26F%20India%20Pvt\.%20Limited\./)
  assert.equal(bcCalls.at(-1).body.searchText, 'SAN MARINO')

  const scan = await call('/api/stock/search?barcode=' + encodeURIComponent('https://scan.fandf.in/D0SS'), { as: 'sales' })
  assert.equal(scan.json.items[0].code, 'FF-0042458')
  assert.equal(bcCalls.at(-1).body.qrCode, 'https://scan.fandf.in/D0SS')
  assert.equal(bcCalls.at(-1).body.searchText, '')

  await call('/api/stock/search?q=ZZZ', { as: 'sales' })
  const logs = await call('/api/admin/logs?type=search')
  assert.equal(logs.json.total, 3)
  assert.equal(logs.json.logs[0].found, false)
  assert.equal(logs.json.logs[0].query, 'ZZZ')
})

test('item detail: quantities add up; salesman never receives cost/vendor data', async () => {
  const sales = (await call('/api/stock/item/FF-0042458', { as: 'sales' })).json.item
  assert.equal(sales.stock.current, 115.82)
  assert.equal(sales.stock.reserved, 1.3)
  assert.equal(sales.stock.available, 114.52)
  assert.deepEqual(sales.stock.locations, [{ location: 'FFDH', qty: 42.92 }, { location: 'FFMUM', qty: 72.9 }])
  assert.equal(sales.po.deliveryStatus, 'UNDER PRODUCTION')
  assert.equal(sales.po.biltyDate, null)
  assert.equal(sales.admin, undefined)
  assert.ok(!JSON.stringify(sales).includes('TEE GEE'))
  assert.ok(!JSON.stringify(sales).includes('220'))

  const admin = (await call('/api/stock/item/ff-0042458')).json.item
  assert.equal(admin.admin.purchasePrice, 220)
  assert.equal(admin.admin.externalItemId, 'LM073-33')
  assert.equal(admin.vendor.status, 'not_configured', 'no vendor API connected -> nothing, not an error')

  assert.equal((await call('/api/stock/item/NOPE')).status, 404)
})

test('vendor API: log in first, then call with the returned token; password stays write-only', async () => {
  const form = {
    name: 'R.R.DECOR (P) LTD.', method: 'GET', url: 'https://203.0.113.20/stock/{{externalItemId}}', authType: 'login',
    authConfig: { loginUrl: 'https://203.0.113.20/auth/login', tokenPath: 'token', loginBody: '{"login_id":"u","password":"pw"}' },
    mapping: { total: 'data.availability.current_available_meters', list: 'data.availability.lot_stock', label: 'location_code', qty: 'available_meters' },
  }
  const ok = await call('/api/admin/vendors/test', { method: 'POST', body: { ...form, externalItemId: '1' } })
  assert.equal(ok.json.ok, true, ok.json.error)
  assert.equal(ok.json.preview.stock, 95.7)
  const bad = await call('/api/admin/vendors/test', { method: 'POST', body: { ...form, authConfig: { ...form.authConfig, loginBody: '{"password":"x"}' }, externalItemId: '1' } })
  assert.equal(bad.json.ok, false)
  const saved = await call('/api/admin/vendors', { method: 'POST', body: form })
  assert.equal(saved.status, 201)
  assert.ok(!JSON.stringify(saved.json).includes('"pw"') && !JSON.stringify(saved.json).includes('password'))
  assert.equal(saved.json.vendor.authConfig.tokenPath, 'token')
  await call(`/api/admin/vendors/${saved.json.vendor.id}`, { method: 'DELETE' })
})

test('vendor API: any response shape is mapped to stock + breakdown, secret stays write-only', async () => {
  const form = {
    name: 'TEE GEE FABRICS', method: 'GET', url: 'https://203.0.113.10/items/{{externalItemId}}',
    authType: 'bearer', authSecret: 'vendor-token',
    mapping: { list: 'data.warehouses', label: 'city', qty: 'free', poExpected: 'data.eta' },
  }
  const probe = await call('/api/admin/vendors/test', { method: 'POST', body: { ...form, externalItemId: 'LM073-33' } })
  assert.equal(probe.json.ok, true)
  assert.ok(probe.json.paths.some((p) => p.path === 'data.warehouses[0].city'))
  assert.deepEqual(probe.json.preview.breakdown, [{ label: 'Surat', qty: 120.5 }, { label: 'Delhi', qty: 30 }])
  assert.equal(probe.json.preview.stock, 150.5)

  const bad = await call('/api/admin/vendors/test', { method: 'POST', body: { ...form, authSecret: 'wrong', externalItemId: 'x' } })
  assert.equal(bad.json.ok, false)
  const internal = await call('/api/admin/vendors/test', { method: 'POST', body: { ...form, url: 'http://127.0.0.1/x', externalItemId: 'x' } })
  assert.match(internal.json.error, /Internal/)

  const saved = await call('/api/admin/vendors', { method: 'POST', body: form })
  assert.equal(saved.status, 201)
  assert.ok(!JSON.stringify(saved.json).includes('vendor-token'))

  const detail = (await call('/api/stock/item/FF-0042458', { as: 'sales' })).json.item
  assert.equal(detail.vendor.status, 'ok')
  assert.equal(detail.vendor.stock, 150.5)
  assert.equal(detail.vendor.po.expected, '2026-11-10')
  const { normalize, isValidPath } = await import('../src/services/vendorConnector.js')
  assert.equal(normalize([{ qty: 2 }, { qty: '3' }], { list: '$', qty: 'qty' }).stock, 5, 'response that is itself a list')
  assert.ok(isValidPath('[0].qty') && isValidPath('$'))
  const many = { items: [{ id: 'A1', qty: 5 }, { id: 'lm073-33', qty: 7 }] }
  const hit = normalize(many, { match: 'items[0].id', total: 'items[0].qty' }, 'LM073-33')
  assert.equal(hit.stock, 7, 'reads the row whose id is the external id')
  const miss = normalize(many, { match: 'items[0].id', total: 'items[0].qty' }, 'NOPE')
  assert.deepEqual([miss.stock, miss.matched], [null, false])
  assert.equal(detail.totalStock, 266.32, 'total = our 115.82 + vendor 150.5')
  const { items } = (await call('/api/stock/search?q=SAN')).json
  assert.equal(items.find((i) => i.code === 'FF-0042458').total, 266.32)
  assert.equal(items.find((i) => i.code === 'FF-0042473').total, 2.16, 'no vendor -> our stock only')
  assert.ok(!JSON.stringify(detail).includes('TEE GEE'), 'salesman still never sees the vendor name')
  assert.equal((await call('/api/admin/vendors', { as: 'sales' })).status, 403)
})

test('cross-origin writes are blocked', async () => {
  const r = await call('/api/admin/config/bc', { method: 'PUT', body: {}, headers: { Origin: 'https://evil.example' } })
  assert.equal(r.status, 403)
})

test('media: salesman cannot upload, admin can, bad types rejected', async () => {
  const form = () => {
    const f = new FormData()
    f.append('files', new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], { type: 'image/png' }), 'a.png')
    return f
  }
  const post = (as) => realFetch(base + '/api/media/hero', { method: 'POST', headers: { Cookie: jar[as] }, body: form() })
  assert.equal((await post('sales')).status, 403)
  const ok = await post('admin')
  assert.equal(ok.status, 201)
  const { media } = await ok.json()
  const file = await realFetch(base + media[0].url, { headers: { Cookie: jar.sales } })
  assert.equal(file.status, 200)
  assert.equal(file.headers.get('content-type'), 'image/png')

  const bad = new FormData()
  bad.append('files', new Blob(['<script>'], { type: 'text/html' }), 'x.html')
  const rejected = await realFetch(base + '/api/media/upcoming', { method: 'POST', headers: { Cookie: jar.admin }, body: bad })
  assert.equal(rejected.status, 400)
})

test('change password invalidates other sessions', async () => {
  const other = await call('/api/auth/login', { method: 'POST', body: { email: 'admin@test.in', password: 'admin-pass-123' }, as: 'admin2' })
  assert.equal(other.status, 200)
  const r = await call('/api/auth/change-password', { method: 'POST', body: { current: 'admin-pass-123', next: 'a-new-password-9' } })
  assert.equal(r.status, 200)
  assert.equal((await call('/api/auth/me')).status, 200, 'current device stays signed in')
  assert.equal((await call('/api/auth/me', { as: 'admin2' })).json.user, null)
  assert.equal((await call('/api/admin/stats', { as: 'admin2' })).status, 401)
})
