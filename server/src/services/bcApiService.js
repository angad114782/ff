// Business Central OData client.
import { memoAsync } from '../lib/memo.js'
import { bcODataRoot, getBcConfig } from './bcConfig.js'

const TIMEOUT_MS = 15_000
const RETRY_STATUS = new Set([429, 502, 503, 504])

export class BcError extends Error {
  constructor(message, { status, configIssue = false } = {}) {
    super(message)
    this.status = status
    this.configIssue = configIssue
  }
}

let cachedToken = null // { key, value, expiresAt }

export function isConfigured() {
  const { tenantId, environment, clientId, clientSecret } = getBcConfig()
  return Boolean(tenantId && environment && clientId && clientSecret)
}

async function timedFetch(url, init) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
}

async function getToken(cfg, { force = false } = {}) {
  const key = `${cfg.tenantId}|${cfg.clientId}|${cfg.clientSecret}`
  if (!force && cachedToken?.key === key && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value

  let res
  try {
    res = await timedFetch(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        scope: 'https://api.businesscentral.dynamics.com/.default',
      }),
    })
  } catch {
    throw new BcError('Could not reach Microsoft sign-in.')
  }
  if (!res.ok) {
    throw new BcError('Business Central rejected the credentials — check Tenant ID, Client ID and Secret.', {
      status: res.status,
      configIssue: true,
    })
  }
  const json = await res.json()
  cachedToken = { key, value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }
  return cachedToken.value
}

const EMPTY_SEARCH = {
  collectionCode: '',
  brand: '',
  category: '',
  searchText: '',
  qrCode: '',
  pageNo: 1,
  pageSize: 20,
  sortBy: '',
  sortOrder: '',
}

// BC wraps the payload twice: the OData body is { "value": "<JSON string>" } and that
// string itself parses to { "value": [ ...items ] }.
export function unwrap(body) {
  const inner = typeof body?.value === 'string' ? JSON.parse(body.value) : body
  const rows = inner?.value ?? inner
  return Array.isArray(rows) ? rows : []
}

async function post(cfg, payload) {
  const url = `${bcODataRoot(cfg)}/TradeApp_API_SearchStock?company=${encodeURIComponent(cfg.company)}`
  let token = await getToken(cfg)
  let refreshed = false

  for (let attempt = 0; ; attempt++) {
    let res
    try {
      res = await timedFetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch {
      if (attempt === 0) continue
      throw new BcError('Business Central did not respond in time.')
    }
    if (res.status === 401 && !refreshed) {
      refreshed = true
      token = await getToken(cfg, { force: true })
      continue
    }
    if (RETRY_STATUS.has(res.status) && attempt === 0) continue
    if (!res.ok) {
      throw new BcError(`Business Central returned ${res.status}.`, {
        status: res.status,
        configIssue: res.status === 401 || res.status === 403 || res.status === 404,
      })
    }
    return res.json()
  }
}

// `searchText` matches item no / item name / SKU; `qrCode` is for barcode scans.
async function fetchStock(params) {
  if (!isConfigured()) throw new BcError('Business Central is not configured.', { configIssue: true })
  const body = await post(getBcConfig(), { ...EMPTY_SEARCH, ...params })
  return unwrap(body)
}

// Searching and then opening the same item hits BC twice within seconds; a short cache makes the
// second call instant. Stock can be up to 30 s old.
export const searchStock = memoAsync(fetchStock, { ttlMs: 30_000 })
