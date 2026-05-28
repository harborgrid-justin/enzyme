/**
 * Tiny TTL memoizer for the bridge's read endpoints.
 *
 * `az` calls take 1-3s each — easily 10s+ when chained. Without caching, every
 * panel re-render in the studio would trigger a fresh ARM round-trip. We
 * cache successful results for `ttlMs`, key the cache per-argument tuple, and
 * never cache failures (so a transient `az login` lapse doesn't poison the
 * cache permanently).
 */

const stores = new Map();

export function memoize(fn, { ttlMs, key, keyFn }) {
  const store = new Map();
  stores.set(key ?? fn.name, store);

  return async function memoized(...args) {
    const cacheKey = keyFn != null ? keyFn(...args) : key ?? '__default__';
    const hit = store.get(cacheKey);
    if (hit != null && hit.expiresAt > Date.now()) {
      return hit.value;
    }
    const value = await fn(...args);
    store.set(cacheKey, { value, expiresAt: Date.now() + ttlMs });
    return value;
  };
}

/** Drop everything — used after a write operation (e.g. after a deployment). */
export function invalidateAll() {
  for (const store of stores.values()) store.clear();
}

/** Drop a single cache entry by key prefix. */
export function invalidatePrefix(prefix) {
  for (const store of stores.values()) {
    for (const k of store.keys()) {
      if (k.startsWith(prefix)) store.delete(k);
    }
  }
}
