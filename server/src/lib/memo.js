// Tiny in-memory cache for slow upstream calls: concurrent identical calls share one request,
// and a successful answer is reused for `ttlMs`. Failures are never cached.
export function memoAsync(fn, { ttlMs, max = 500, keyOf = (...a) => JSON.stringify(a), cacheable = () => true }) {
  const done = new Map() // key -> { value, expiresAt }
  const pending = new Map() // key -> Promise

  return (...args) => {
    const key = keyOf(...args)
    const hit = done.get(key)
    if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.value)
    if (pending.has(key)) return pending.get(key)

    const p = fn(...args)
      .then((value) => {
        if (cacheable(value)) {
          if (done.size >= max) done.delete(done.keys().next().value)
          done.set(key, { value, expiresAt: Date.now() + ttlMs })
        }
        return value
      })
      .finally(() => pending.delete(key))
    pending.set(key, p)
    return p
  }
}
