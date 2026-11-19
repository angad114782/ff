// Central, validated environment. Everything else imports from here instead of reading process.env.
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env = process.env
const isProd = env.NODE_ENV === 'production'

// Secrets (session signing + encryption at rest) are normally generated and kept in the database by db.js.
// JWT_SECRET / APP_ENCRYPTION_KEY only need to be set to override them.

export const config = {
  isProd,
  port: Number(env.PORT ?? 4000),
  clientDist: resolve(env.CLIENT_DIST ?? join(root, '../client/dist')),
  // Extra browser origins allowed to make state-changing requests (same-origin is always allowed).
  allowedOrigins: (env.CLIENT_ORIGIN ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  // Hosting platforms put a proxy in front of the app; trusting one hop lets rate limits see real client IPs.
  trustProxy: env.TRUST_PROXY ? Number(env.TRUST_PROXY) || env.TRUST_PROXY : isProd ? 1 : false,
  cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProd,
  sessionHours: Number(env.SESSION_HOURS ?? 12),
  jwtSecret: null, // set by db.js
  encryptionKey: null, // set by db.js
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
