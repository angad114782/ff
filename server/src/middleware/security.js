import { config } from '../config.js'
import { forbidden } from '../lib/errors.js'

// Cookie auth + state-changing requests: reject cross-site browser requests. SameSite=Lax already
// blocks most; this also covers same-site sibling origins. Non-browser clients send no Origin.
export function originCheck(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const origin = req.get('origin')
  if (!origin) return next()
  let host
  try {
    host = new URL(origin).host
  } catch {
    return next(forbidden('Bad origin.'))
  }
  if (host === req.get('host') || config.allowedOrigins.includes(origin)) return next()
  next(forbidden('Cross-origin request blocked.'))
}
