// Business Central connection settings. Stored in the DB with the client secret encrypted at rest.
import { config } from '../config.js'
import { db } from '../db.js'
import { decrypt, encrypt } from '../lib/crypto.js'
import { badRequest } from '../lib/errors.js'
import { str } from '../lib/validate.js'

const KEY = 'bc'
const FIELDS = ['tenantId', 'environment', 'company', 'clientId']

export function getBcConfig() {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(KEY)
  const stored = row ? JSON.parse(row.value) : {}
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

export function saveBcConfig(patch) {
  const current = getBcConfig()
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
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
    KEY,
    JSON.stringify({ ...plain, clientSecret: encrypt(clientSecret) }),
  )
  return next
}

// The secret is write-only: responses say whether one is stored, never what it is.
export function publicBcConfig() {
  const { clientSecret, ...rest } = getBcConfig()
  return { ...rest, hasClientSecret: Boolean(clientSecret), odataRoot: bcODataRoot(rest) }
}
