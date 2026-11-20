// Adds (or replaces, by name) one vendor from a JSON file shaped like the Vendors form.
//   VENDOR_SECRET='<token or password>' node server/scripts/add-vendor.js path/to/vendor.json
// The secret is read from the environment so it never lands in a file or in shell history.
import { readFileSync } from 'node:fs'
import { CI, closeDb, nextId, now, vendors } from '../src/db.js'
import { AUTH_TYPES, packAuth } from '../src/services/vendorAuth.js'

const file = process.argv[2]
if (!file) {
  console.error('Usage: VENDOR_SECRET=… node server/scripts/add-vendor.js vendor.json')
  process.exit(1)
}
const body = JSON.parse(readFileSync(file, 'utf8'))
if (!body.name || !body.url) throw new Error('The JSON needs "name" and "url".')
const authType = AUTH_TYPES.includes(body.authType) ? body.authType : 'none'
if (process.env.VENDOR_SECRET) body.authSecret = process.env.VENDOR_SECRET

const auth = packAuth(authType, body, undefined)
const doc = {
  name: body.name,
  method: body.method === 'POST' ? 'POST' : 'GET',
  url: body.url,
  body: body.body ?? '',
  auth_type: authType,
  auth_name: auth.auth_name,
  auth_secret: auth.auth_secret,
  mapping: body.mapping ?? {},
  resolve: body.resolve ?? null,
  active: true,
}
const existing = await vendors.findOne({ name: doc.name }, { collation: CI })
if (existing) {
  await vendors.updateOne({ _id: existing._id }, { $set: doc })
  console.log(`Updated vendor "${doc.name}".`)
} else {
  await vendors.insertOne({ _id: await nextId('vendors'), ...doc, created_at: now() })
  console.log(`Added vendor "${doc.name}".`)
}
await closeDb()
