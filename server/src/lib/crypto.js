import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { config } from '../config.js'

const KEY_LEN = 64

export function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, KEY_LEN)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

export function verifyPassword(password, stored) {
  const [scheme, saltB64, hashB64] = String(stored ?? '').split('$')
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, 'base64')
  const actual = scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length)
  return timingSafeEqual(actual, expected)
}

// AES-256-GCM for credentials stored at rest. Format: enc:v1:<iv>:<tag>:<ciphertext> (base64).
export function encrypt(plain) {
  if (!plain) return ''
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', config.encryptionKey, iv)
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  return `enc:v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${data.toString('base64')}`
}

export function decrypt(value) {
  if (!value) return ''
  const [prefix, version, iv, tag, data] = String(value).split(':')
  if (prefix !== 'enc' || version !== 'v1') throw new Error('Unrecognised encrypted value.')
  const decipher = createDecipheriv('aes-256-gcm', config.encryptionKey, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8')
}
