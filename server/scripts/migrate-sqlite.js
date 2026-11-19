// One-time import of an old SQLite database (users, logs, settings, vendors, media + uploaded files) into MongoDB.
//   MONGODB_URI=... node scripts/migrate-sqlite.js [path/to/app.db] [path/to/uploads]
// Safe to re-run: existing ids are skipped. The old encryption key is carried over, so stored credentials keep working.
import { existsSync, createReadStream, readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { dirname, join, resolve } from 'node:path'
import { database, logs, media, mediaFiles, settings, users, vendors } from '../src/db.js'

const file = resolve(process.argv[2] ?? 'data/app.db')
const uploads = resolve(process.argv[3] ?? join(dirname(file), 'uploads'))
if (!existsSync(file)) {
  console.error(`SQLite file not found: ${file}`)
  process.exit(1)
}
const sqlite = new DatabaseSync(file, { readOnly: true })
const all = (sql) => sqlite.prepare(sql).all()
const json = (s, fallback) => {
  try {
    return s ? JSON.parse(s) : fallback
  } catch {
    return fallback
  }
}

async function copy(collection, docs, label) {
  let added = 0
  for (const doc of docs) {
    if (await collection.findOne({ _id: doc._id }, { projection: { _id: 1 } })) continue
    await collection.insertOne(doc)
    added++
  }
  const max = docs.reduce((m, d) => Math.max(m, d._id), 0)
  if (max) await database.collection('counters').updateOne({ _id: label }, { $max: { seq: max } }, { upsert: true })
  console.log(`${label}: ${added} added, ${docs.length - added} already there`)
}

await copy(users, all('SELECT * FROM users').map((u) => ({
  _id: u.id, name: u.name, email: u.email.toLowerCase(), phone: u.phone, role: u.role, branch: u.branch,
  active: Boolean(u.active), password_hash: u.password_hash, token_version: u.token_version, created_at: u.created_at,
})), 'users')

await copy(vendors, all('SELECT * FROM vendors').map((v) => {
  let resolveStep = null
  try {
    resolveStep = v.resolve ? JSON.parse(v.resolve) : null
  } catch { /* none */ }
  return {
    _id: v.id, name: v.name, method: v.method, url: v.url, body: v.body, auth_type: v.auth_type,
    auth_name: v.auth_name, auth_secret: v.auth_secret, mapping: json(v.mapping, {}), resolve: resolveStep,
    active: Boolean(v.active), created_at: v.created_at,
  }
}), 'vendors')

await copy(logs, all('SELECT * FROM logs').map((l) => ({
  _id: l.id, type: l.type, user_id: l.user_id, name: l.name, email: l.email, query: l.query,
  found: l.found === null ? null : Boolean(l.found), detail: l.detail, created_at: l.created_at,
})), 'logs')

const mediaRows = all('SELECT * FROM media')
const docs = []
for (const m of mediaRows) {
  if (await media.findOne({ _id: m.id }, { projection: { _id: 1 } })) continue
  const path = join(uploads, m.file)
  if (!existsSync(path)) {
    console.warn(`media ${m.id}: file ${m.file} is missing, skipped`)
    continue
  }
  const out = mediaFiles.openUploadStream(m.name, { contentType: m.mime })
  await new Promise((ok, fail) => createReadStream(path).pipe(out).on('finish', ok).on('error', fail))
  docs.push({ _id: m.id, kind: m.kind, name: m.name, type: m.type, mime: m.mime, file_id: out.id, created_at: m.created_at })
}
await copy(media, docs, 'media')

// Settings (Business Central connection). The key that encrypts them must come along, or they would be unreadable.
for (const s of all('SELECT * FROM settings')) {
  if (!(await settings.findOne({ _id: s.key }))) await settings.insertOne({ _id: s.key, value: s.value })
}
const secrets = join(dirname(file), 'dev-secrets.json')
if (existsSync(secrets)) {
  const old = JSON.parse(readFileSync(secrets, 'utf8'))
  await settings.updateOne({ _id: 'secrets' }, { $set: { value: JSON.stringify(old) } }, { upsert: true })
  console.log('secrets: carried over from dev-secrets.json (restart the app so it picks them up)')
} else {
  console.log('secrets: none found. If the old app used JWT_SECRET / APP_ENCRYPTION_KEY, set the same values as env vars.')
}
console.log('Done.')
process.exit(0)
