// Central, validated environment. Everything else imports from here instead of reading process.env.
import { randomBytes } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env = process.env
const isProd = env.NODE_ENV === 'production'

const dataDir = resolve(env.DATA_DIR ?? join(root, 'data'))
mkdirSync(dataDir, { recursive: true })

// In production the secrets must be supplied explicitly. In dev/test they're generated once
// and kept in DATA_DIR so sessions and stored credentials survive restarts.
function devSecrets() {
  const file = join(dataDir, 'dev-secrets.json')
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'))
  const secrets = {
    jwtSecret: randomBytes(48).toString('base64'),
    encryptionKey: randomBytes(32).toString('base64'),
  }
  writeFileSync(file, JSON.stringify(secrets), { mode: 0o600 })
  chmodSync(file, 0o600)
  return secrets
}

const fallback = isProd ? {} : devSecrets()
const jwtSecret = env.JWT_SECRET ?? fallback.jwtSecret
const encryptionKey = env.APP_ENCRYPTION_KEY ?? fallback.encryptionKey

if (isProd) {
  const problems = []
  if (!jwtSecret || jwtSecret.length < 32) problems.push('JWT_SECRET must be set (32+ characters)')
  if (!encryptionKey || Buffer.from(encryptionKey, 'base64').length !== 32) {
    problems.push('APP_ENCRYPTION_KEY must be set (base64-encoded 32 bytes: `openssl rand -base64 32`)')
  }
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) problems.push('ADMIN_EMAIL and ADMIN_PASSWORD are required to create the first admin')
  if (problems.length) {
    console.error(`Invalid configuration:\n - ${problems.join('\n - ')}`)
    process.exit(1)
  }
}

export const config = {
  isProd,
  port: Number(env.PORT ?? 4000),
  dataDir,
  uploadDir: join(dataDir, 'uploads'),
  clientDist: resolve(env.CLIENT_DIST ?? join(root, '../client/dist')),
  // Extra browser origins allowed to make state-changing requests (same-origin is always allowed).
  allowedOrigins: (env.CLIENT_ORIGIN ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  trustProxy: env.TRUST_PROXY ? Number(env.TRUST_PROXY) || env.TRUST_PROXY : false,
  cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProd,
  sessionHours: Number(env.SESSION_HOURS ?? 12),
  jwtSecret,
  encryptionKey: Buffer.from(encryptionKey, 'base64'),
  admin: {
    name: env.ADMIN_NAME ?? 'Administrator',
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  },
  bcDefaults: {
    tenantId: env.BC_TENANT_ID ?? '',
    environment: env.BC_ENVIRONMENT ?? '',
    company: env.BC_COMPANY ?? 'F&F India Pvt. Limited.',
    clientId: env.BC_CLIENT_ID ?? '',
    clientSecret: env.BC_CLIENT_SECRET ?? '',
  },
}
