// MongoDB storage. The only thing that has to be configured in production is MONGODB_URI: the signing
// and encryption secrets, uploaded media and every setting live in the database itself.
import { randomBytes } from 'node:crypto'
import { GridFSBucket, MongoClient } from 'mongodb'
import { config } from './config.js'
import { hashPassword } from './lib/crypto.js'

const uri = process.env.MONGODB_URI ?? process.env.DATABASE_URL
if (!uri) {
  console.error('Invalid configuration:\n - MONGODB_URI is required (your MongoDB connection string)')
  process.exit(1)
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000, appName: 'ff-stock-checker' })
try {
  await client.connect()
} catch (err) {
  console.error(`Could not connect to MongoDB: ${err.message}`)
  process.exit(1)
}

// The database name comes from the connection string (".../ff_stock"); default when it has none.
export const database = client.db(new URL(uri.replace(/^mongodb(\+srv)?:/, 'http:')).pathname.slice(1) || 'ff_stock')
export const users = database.collection('users')
export const logs = database.collection('logs')
export const settings = database.collection('settings')
export const vendors = database.collection('vendors')
export const media = database.collection('media')
export const mediaFiles = new GridFSBucket(database, { bucketName: 'media_files' })

// Numeric ids (1, 2, 3 ...) keep the API and the client exactly as they were with SQL.
export async function nextId(name) {
  const doc = await database.collection('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  )
  return doc.seq
}

export const now = () => new Date().toISOString()

// Documents use `_id` as the numeric id; the rest of the app reads `id`.
export const row = (doc) => (doc ? { ...doc, id: doc._id } : null)
export const rows = (docs) => docs.map(row)

const ci = { locale: 'en', strength: 2 } // case-insensitive collation
export const CI = ci

await Promise.all([
  users.createIndex({ email: 1 }, { unique: true }),
  users.createIndex({ role: 1 }),
  logs.createIndex({ created_at: -1 }),
  logs.createIndex({ type: 1, created_at: -1 }),
  vendors.createIndex({ name: 1 }, { unique: true, collation: ci }),
])

// Secrets: taken from the environment when set, otherwise generated once and kept in the database.
// $setOnInsert makes first start safe even when several instances boot at the same time.
{
  await settings.updateOne(
    { _id: 'secrets' },
    {
      $setOnInsert: {
        value: JSON.stringify({
          jwtSecret: randomBytes(48).toString('base64'),
          encryptionKey: randomBytes(32).toString('base64'),
        }),
      },
    },
    { upsert: true },
  )
  const stored = JSON.parse((await settings.findOne({ _id: 'secrets' })).value)
  config.jwtSecret = process.env.JWT_SECRET ?? stored.jwtSecret
  config.encryptionKey = Buffer.from(process.env.APP_ENCRYPTION_KEY ?? stored.encryptionKey, 'base64')
  if (config.jwtSecret.length < 32 || config.encryptionKey.length !== 32) {
    console.error('Invalid configuration:\n - JWT_SECRET must be 32+ characters and APP_ENCRYPTION_KEY base64 of 32 bytes')
    process.exit(1)
  }
}

export const hasAdmin = async () => Boolean(await users.findOne({ role: 'admin' }, { projection: { _id: 1 } }))

// Creates the first admin. Used by the first-run setup screen and, optionally, ADMIN_EMAIL/ADMIN_PASSWORD.
// The settings lock makes sure two simultaneous calls can never create two admins.
export async function createFirstAdmin({ name, email, password }) {
  if (await hasAdmin()) return null
  try {
    await settings.insertOne({ _id: 'first_admin_lock', value: now() })
  } catch {
    return null
  }
  try {
    const doc = {
      _id: await nextId('users'),
      name,
      email,
      phone: '',
      role: 'admin',
      branch: '',
      active: true,
      password_hash: hashPassword(password),
      token_version: 0,
      created_at: now(),
    }
    await users.insertOne(doc)
    return row(doc)
  } catch (err) {
    await settings.deleteOne({ _id: 'first_admin_lock' })
    throw err
  }
}

export async function bootstrapAdmin() {
  const { email, password, name } = config.admin
  if (!email || !password) return
  if (await createFirstAdmin({ name, email: email.trim().toLowerCase(), password })) console.log(`Created admin account for ${email}`)
}

export const closeDb = () => client.close()
