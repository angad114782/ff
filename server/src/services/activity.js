import { logs, nextId, now } from '../db.js'

export async function logActivity({ type, user, name, email, query = null, found = null, detail = null }) {
  await logs.insertOne({
    _id: await nextId('logs'),
    type,
    user_id: user?.id ?? null,
    name: name ?? user?.name ?? 'System',
    email: email ?? user?.email ?? '',
    query,
    found,
    detail,
    created_at: now(),
  })
}

// Something went wrong while serving a request (vendor API, Business Central...): keep it for the admin.
export async function logProblem(user, message, query = null) {
  try {
    await logActivity({ type: 'problem', user, query, detail: String(message).slice(0, 500) })
  } catch (err) {
    console.warn('could not log a problem:', err.message)
  }
}
