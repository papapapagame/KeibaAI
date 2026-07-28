/* ========================================
   HTTP Cache — ETag / Last-Modified / TTL
   ======================================== */

export const HTTP_CACHE_VERSION = "10.8.0";
export const HTTP_CACHE_KEY = "papapa_iq_http_cache_v108";

const memory = new Map();

function loadStore() {
  try {
    const raw = sessionStorage.getItem(HTTP_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function saveStore(store) {
  try {
    sessionStorage.setItem(HTTP_CACHE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export function getHttpCacheEntry(url) {
  if (memory.has(url)) return memory.get(url);
  const store = loadStore();
  const entry = store[url] || null;
  if (entry) memory.set(url, entry);
  return entry;
}

export function setHttpCacheEntry(url, entry) {
  const next = {
    url,
    etag: entry.etag || null,
    lastModified: entry.lastModified || null,
    body: entry.body ?? null,
    json: entry.json ?? null,
    status: entry.status ?? 200,
    fetchedAt: entry.fetchedAt || new Date().toISOString(),
    ttlMs: Number(entry.ttlMs) || 10 * 60 * 1000,
    size: Number(entry.size) || 0,
    contentType: entry.contentType || null,
  };
  memory.set(url, next);
  const store = loadStore();
  store[url] = next;
  saveStore(store);
  return next;
}

export function isHttpCacheFresh(entry, ttlMs) {
  if (!entry?.fetchedAt) return false;
  const ttl = Number(ttlMs ?? entry.ttlMs) || 0;
  if (ttl <= 0) return false;
  const t = Date.parse(entry.fetchedAt);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < ttl;
}

export function clearHttpCache() {
  memory.clear();
  try {
    sessionStorage.removeItem(HTTP_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function getHttpCacheStats() {
  const store = loadStore();
  const keys = Object.keys(store);
  let totalSize = 0;
  for (const k of keys) totalSize += Number(store[k]?.size) || 0;
  return {
    entries: keys.length,
    totalSize,
    version: HTTP_CACHE_VERSION,
  };
}

export const HttpCache = {
  get: getHttpCacheEntry,
  set: setHttpCacheEntry,
  isFresh: isHttpCacheFresh,
  clear: clearHttpCache,
  stats: getHttpCacheStats,
  version: HTTP_CACHE_VERSION,
};
