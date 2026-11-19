// Business Central connection settings. Stored in the DB with the client secret encrypted at rest.
import { config } from '../config.js'
import { decrypt, encrypt } from '../lib/crypto.js'
import { badRequest } from '../lib/errors.js'
import { str } from '../lib/validate.js'

const KEY = 'bc'
const FIELDS = ['tenantId', 'environment', 'company', 'clientId']

// Read from the database, kept in memory for a few seconds (it is needed on every BC call).
let cached = null // { at, stored }
export async function getBcConfig() {
  if (!cached || Date.now() - cached.at > 5000) {
    const { settings } = await import('../db.js') // lazy: keeps pure helpers importable without a database
    const row = await settings.findOne({ _id: KEY })
    cached = { at: Date.now(), stored: row ? JSON.parse(row.value) : {} }
  }
  const stored = cached.stored
  const { clientSecret: encSecret, ...rest } = stored
  return {
    ...config.bcDefaults,
    ...rest,
    clientSecret: encSecret ? decrypt(encSecret) : config.bcDefaults.clientSecret,
  }
}

export function bcODataRoot({ tenantId, environment }) {
  return `https://api.businesscentral.dynamics.com/v2.0/${tenantId}/${environment}/ODataV4`
}

// tenantId / environment end up in the request URL path, so keep them to safe characters.
const SAFE = /^[A-Za-z0-9._-]+$/

export async function saveBcConfig(patch) {
  const current = await getBcConfig()
  const next = { ...current }
  for (const f of FIELDS) {
    if (patch[f] === undefined) continue
    // A company name is matched exactly by Business Central, and some end with a space ("F&F Global ").
    next[f] = f === 'company' && typeof patch[f] === 'string' && patch[f].trim() && patch[f].length <= 120
      ? patch[f]
      : str(patch[f], f, { max: 120, optional: true })
  }
  for (const f of ['tenantId', 'environment']) {
    if (next[f] && !SAFE.test(next[f])) throw badRequest(`${f} contains invalid characters.`)
  }
  if (typeof patch.clientSecret === 'string' && patch.clientSecret.trim()) {
    next.clientSecret = patch.clientSecret.trim()
  }

  const { clientSecret, ...plain } = next
  const value = JSON.stringify({ ...plain, clientSecret: encrypt(clientSecret) })
  const { settings } = await import('../db.js')
  await settings.updateOne({ _id: KEY }, { $set: { value } }, { upsert: true })
  cached = null
  return next
}

// The secret is write-only: responses say whether one is stored, never what it is.
export async function publicBcConfig() {
  const { clientSecret, ...rest } = await getBcConfig()
  return { ...rest, hasClientSecret: Boolean(clientSecret), odataRoot: bcODataRoot(rest) }
}
