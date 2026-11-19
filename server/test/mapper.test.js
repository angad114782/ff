import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'ff-test-'))
const { unwrap } = await import('../src/services/bcApiService.js')
const { mapItem } = await import('../src/services/stockMapper.js')
const { encrypt, decrypt, hashPassword, verifyPassword } = await import('../src/lib/crypto.js')

test('unwrap handles the double-encoded BC envelope and plain arrays', () => {
  assert.deepEqual(unwrap({ value: JSON.stringify({ value: [{ itemNo: 'A' }] }) }), [{ itemNo: 'A' }])
  assert.deepEqual(unwrap({ value: [{ itemNo: 'B' }] }), [{ itemNo: 'B' }])
  assert.deepEqual(unwrap({ value: '{}' }), [])
  assert.deepEqual(unwrap(null), [])
})

test('mapItem tolerates missing / blank fields and float noise', () => {
  const item = mapItem({ itemNo: 'X', itemName: 'Y', QtyFree: '', QtySO: null, lots: [{ lotNo: 1, locationCode: 'A', quantity: 0.1 }, { lotNo: 2, locationCode: 'A', quantity: 0.2 }] })
  assert.equal(item.stock.current, 0.3)
  assert.equal(item.stock.available, 0)
  assert.equal(item.status, 'out_of_stock')
  assert.equal(item.po.qty, 0)
  assert.equal(item.mrp, null)
})

test('crypto round-trips and rejects tampering', () => {
  assert.equal(decrypt(encrypt('s3cret')), 's3cret')
  const parts = encrypt('s3cret').split(':')
  parts[4] = Buffer.from('tampered').toString('base64')
  assert.throws(() => decrypt(parts.join(':')))
  const h = hashPassword('pw-12345678')
  assert.ok(verifyPassword('pw-12345678', h))
  assert.ok(!verifyPassword('wrong', h))
})
