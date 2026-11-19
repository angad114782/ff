import { db } from '../db.js'

export function logActivity({ type, user, name, email, query = null, found = null, detail = null }) {
  db.prepare('INSERT INTO logs (type, user_id, name, email, query, found, detail) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    type,
    user?.id ?? null,
    name ?? user?.name ?? 'System',
    email ?? user?.email ?? '',
    query,
    found === null ? null : found ? 1 : 0,
    detail,
  )
}

// Something went wrong while serving a request (vendor API, Business Central...): keep it for the admin.
export function logProblem(user, message, query = null) {
  try {
    logActivity({ type: 'problem', user, query, detail: String(message).slice(0, 500) })
  } catch (err) {
    console.warn('could not log a problem:', err.message)
  }
}
