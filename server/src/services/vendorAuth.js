// How we log in to a vendor's API. Simple kinds keep their name in `auth_name` and the secret (encrypted)
// in `auth_secret`. Richer kinds keep their settings as JSON: the non-secret part in `auth_name`,
// the secret part (encrypted) in `auth_secret`, so secrets never travel back to the browser.
import { decrypt, encrypt } from '../lib/crypto.js'
import { badRequest } from '../lib/errors.js'

export const AUTH_TYPES = ['none', 'bearer', 'header', 'query', 'basic', 'login', 'oauth2', 'headers']
export const TOKEN_TYPES = new Set(['login', 'oauth2'])
const JSON_TYPES = new Set(['login', 'oauth2', 'headers'])
const TOKEN_TTL_MS = 10 * 60_000
const TIMEOUT_MS = 8000

const parseJson = (s) => {
  try {
    const v = JSON.parse(s)
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}
const text = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const secretOf = (row) => (row?.auth_secret ? decrypt(row.auth_secret) : '')
const isHttp = (u) => /^https?:\/\//i.test(u)
const validPath = (p) => /^([\w$-]+|\[\d+\])(\.[\w$-]+|\[\d+\])*$/.test(p)

// Turns the form's auth fields into the two stored columns. A blank secret keeps the stored one.
export function packAuth(type, body, existing) {
  const same = existing?.auth_type === type ? existing : null
  if (type === 'none') return { auth_name: '', auth_secret: '' }

  if (!JSON_TYPES.has(type)) {
    const name = text(body?.authName, 100)
    if (['header', 'query', 'basic'].includes(type) && !name) {
      throw badRequest(type === 'basic' ? 'Enter the username.' : 'Enter the header / parameter name.')
    }
    const secret = typeof body?.authSecret === 'string' && body.authSecret ? encrypt(body.authSecret) : same?.auth_secret ?? ''
    return { auth_name: type === 'bearer' ? '' : name, auth_secret: secret }
  }

  const c = body?.authConfig ?? {}
  const old = parseJson(secretOf(same))

  if (type === 'login') {
    const loginUrl = text(c.loginUrl)
    if (!isHttp(loginUrl)) throw badRequest('Enter the login web address (starting with https://).')
    const tokenPath = text(c.tokenPath, 100) || 'token'
    if (!validPath(tokenPath)) throw badRequest(`"${tokenPath}" is not a valid token field.`)
    const loginBody = text(c.loginBody, 5000) || old.loginBody || ''
    if (!loginBody) throw badRequest('Enter the login details (JSON) to send.')
    if (!Object.keys(parseJson(loginBody)).length) throw badRequest('The login details must be valid JSON.')
    return { auth_name: JSON.stringify({ loginUrl, tokenPath }), auth_secret: encrypt(JSON.stringify({ loginBody })) }
  }

  if (type === 'oauth2') {
    const tokenUrl = text(c.tokenUrl)
    if (!isHttp(tokenUrl)) throw badRequest('Enter the token web address (starting with https://).')
    const clientId = text(c.clientId, 200)
    const clientSecret = text(c.clientSecret, 500) || old.clientSecret || ''
    if (!clientId || !clientSecret) throw badRequest('Enter the client ID and client secret.')
    return {
      auth_name: JSON.stringify({ tokenUrl, clientId, scope: text(c.scope, 300) }),
      auth_secret: encrypt(JSON.stringify({ clientSecret })),
    }
  }

  // headers: several fixed headers, e.g. x-api-key + x-client-id.
  const list = Array.isArray(c.headers) ? c.headers.slice(0, 10) : []
  const names = []
  const values = {}
  for (const h of list) {
    const name = text(h?.name, 100)
    if (!name) continue
    if (!/^[\w-]+$/.test(name)) throw badRequest(`"${name}" is not a valid header name.`)
    const value = text(h?.value, 1000) || old[name] || ''
    if (!value) throw badRequest(`Enter a value for the "${name}" header.`)
    names.push(name)
    values[name] = value
  }
  if (!names.length) throw badRequest('Add at least one header.')
  return { auth_name: JSON.stringify({ names }), auth_secret: encrypt(JSON.stringify(values)) }
}

// What the browser may see: never a secret.
export function publicAuth(row) {
  if (!JSON_TYPES.has(row.auth_type)) return { authName: row.auth_name, authConfig: {} }
  const c = parseJson(row.auth_name)
  if (row.auth_type === 'headers') return { authName: '', authConfig: { headers: (c.names ?? []).map((name) => ({ name, value: '' })) } }
  return { authName: '', authConfig: c }
}

// ---------- using it ----------

const tokens = new Map() // settings -> { value, expiresAt }

async function postForToken(url, init, what) {
  const { assertSafeUrl } = await import('./vendorConnector.js')
  await assertSafeUrl(url)
  let res
  try {
    res = await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch {
    throw new Error(`The vendor ${what} did not respond.`)
  }
  if (!res.ok) throw new Error(res.status === 401 || res.status === 403 || res.status === 400
    ? `The vendor refused the ${what} details.`
    : `The vendor ${what} returned an error (${res.status}).`)
  try {
    return await res.json()
  } catch {
    throw new Error(`The vendor ${what} did not return JSON.`)
  }
}

async function getToken(row, secretJson, force) {
  const key = `${row.auth_type}|${row.auth_name}|${secretJson}`
  const hit = tokens.get(key)
  if (!force && hit && hit.expiresAt > Date.now()) return hit.value

  const c = parseJson(row.auth_name)
  const s = parseJson(secretJson)
  let value
  let ttl = TOKEN_TTL_MS

  if (row.auth_type === 'login') {
    const json = await postForToken(
      c.loginUrl,
      { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: s.loginBody },
      'login',
    )
    const { getPath } = await import('./vendorConnector.js')
    value = getPath(json, c.tokenPath || 'token')
  } else {
    const json = await postForToken(
      c.tokenUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: c.clientId,
          client_secret: s.clientSecret,
          ...(c.scope ? { scope: c.scope } : {}),
        }),
      },
      'token',
    )
    value = json?.access_token
    if (Number(json?.expires_in) > 120) ttl = (Number(json.expires_in) - 60) * 1000
  }
  if (typeof value !== 'string' || !value) throw new Error('Login worked, but no token was found in the reply.')
  tokens.set(key, { value, expiresAt: Date.now() + ttl })
  return value
}

// Adds the vendor's credentials to a request that is being built.
export async function applyAuth(row, url, headers, { force = false } = {}) {
  const secret = secretOf(row)
  switch (row.auth_type) {
    case 'bearer':
      headers.Authorization = `Bearer ${secret}`
      break
    case 'header':
      if (row.auth_name) headers[row.auth_name] = secret
      break
    case 'query':
      if (row.auth_name) url.searchParams.set(row.auth_name, secret)
      break
    case 'basic':
      headers.Authorization = `Basic ${Buffer.from(`${row.auth_name}:${secret}`).toString('base64')}`
      break
    case 'login':
    case 'oauth2':
      headers.Authorization = `Bearer ${await getToken(row, secret, force)}`
      break
    case 'headers':
      Object.assign(headers, parseJson(secret))
      break
  }
}
