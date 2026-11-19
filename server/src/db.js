import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import { config } from './config.js'
import { hashPassword } from './lib/crypto.js'

export const db = new DatabaseSync(process.env.DB_FILE ?? join(config.dataDir, 'app.db'))

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    phone         TEXT NOT NULL DEFAULT '',
    role          TEXT NOT NULL CHECK (role IN ('admin', 'salesman')),
    branch        TEXT NOT NULL DEFAULT '',
    active        INTEGER NOT NULL DEFAULT 1,
    password_hash TEXT NOT NULL,
    token_version INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT NOT NULL CHECK (type IN ('login', 'search', 'reset_request', 'problem')),
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    query      TEXT,
    found      INTEGER,
    detail     TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE INDEX IF NOT EXISTS logs_created_at ON logs (created_at DESC);

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- One row per vendor API. name matches the vendor name coming from the primary API;
  -- mapping tells the generic connector where to find stock in that vendor's own response shape.
  CREATE TABLE IF NOT EXISTS vendors (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE COLLATE NOCASE,
    method      TEXT NOT NULL DEFAULT 'GET' CHECK (method IN ('GET', 'POST')),
    url         TEXT NOT NULL,
    body        TEXT NOT NULL DEFAULT '',
    auth_type   TEXT NOT NULL DEFAULT 'none',
    auth_name   TEXT NOT NULL DEFAULT '',
    auth_secret TEXT NOT NULL DEFAULT '',
    mapping     TEXT NOT NULL DEFAULT '{}',
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS media (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    kind       TEXT NOT NULL CHECK (kind IN ('hero', 'upcoming')),
    name       TEXT NOT NULL,
    type       TEXT NOT NULL CHECK (type IN ('image', 'video', 'pdf')),
    mime       TEXT NOT NULL,
    file       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`)

// Older databases limited vendors.auth_type to the first five kinds; rebuild the table without that limit.
const vendorsSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'vendors'").get()?.sql ?? ''
if (vendorsSql.includes("'basic')")) {
  db.exec(`
    BEGIN;
    ALTER TABLE vendors RENAME TO vendors_old;
    CREATE TABLE vendors (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE COLLATE NOCASE,
      method      TEXT NOT NULL DEFAULT 'GET' CHECK (method IN ('GET', 'POST')),
      url         TEXT NOT NULL,
      body        TEXT NOT NULL DEFAULT '',
      auth_type   TEXT NOT NULL DEFAULT 'none',
      auth_name   TEXT NOT NULL DEFAULT '',
      auth_secret TEXT NOT NULL DEFAULT '',
      mapping     TEXT NOT NULL DEFAULT '{}',
      active      INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    INSERT INTO vendors SELECT id, name, method, url, body, auth_type, auth_name, auth_secret, mapping, active, created_at FROM vendors_old;
    DROP TABLE vendors_old;
    COMMIT;
  `)
}

// Some vendors need two calls: find the item's id by name, then read stock by that id. `resolve` holds
// that first step as JSON: { url, match, id } (empty = single call).
if (!db.prepare('PRAGMA table_info(vendors)').all().some((c) => c.name === 'resolve')) {
  db.exec("ALTER TABLE vendors ADD COLUMN resolve TEXT NOT NULL DEFAULT ''")
}

// Older databases have no 'problem' log type / detail column; rebuild logs once to add them.
const logsSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'logs'").get()?.sql ?? ''
if (logsSql && !logsSql.includes("'problem'")) {
  db.exec(`
    BEGIN;
    DROP INDEX IF EXISTS logs_created_at;
    ALTER TABLE logs RENAME TO logs_old;
    CREATE TABLE logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      type       TEXT NOT NULL CHECK (type IN ('login', 'search', 'reset_request', 'problem')),
      user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      query      TEXT,
      found      INTEGER,
      detail     TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    INSERT INTO logs (id, type, user_id, name, email, query, found, created_at)
      SELECT id, type, user_id, name, email, query, found, created_at FROM logs_old;
    DROP TABLE logs_old;
    CREATE INDEX logs_created_at ON logs (created_at DESC);
    COMMIT;
  `)
}

// First run: create the admin from env. After that the admin manages their own account.
export function bootstrapAdmin() {
  const { email, password, name } = config.admin
  if (!email || !password) return
  const exists = db.prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1").get()
  if (exists) return
  db.prepare("INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, 'admin', ?)").run(
    name,
    email.trim(),
    hashPassword(password),
  )
  console.log(`Created admin account for ${email}`)
}
