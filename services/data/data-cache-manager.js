/* ========================================
   DataCacheManager — Ver7.0
   Memory + LocalStorage（将来 IndexedDB 移行可能な構造）
   ======================================== */

import { DATA_CACHE_TTL_MS } from "../../js/config.js";
import { nowIso, safeJsonParse } from "./utils.js";

export const DATA_PLATFORM_CACHE_KEY = "papapa_iq_data_platform_cache_v70";
export const DATA_PLATFORM_CACHE_META_KEY = "papapa_iq_data_platform_cache_meta_v70";

const memory = new Map();

/**
 * キャッシュエントリ構造（IndexedDB 移行想定）
 * { key, value, fetchedAt, ttlMs, providerId, layer: 'memory'|'local'|'indexeddb' }
 */
export function readCache(key, options = {}) {
  const ttl = options.ttlMs ?? DATA_CACHE_TTL_MS;

  const mem = memory.get(key);
  if (mem && !isExpired(mem.fetchedAt, ttl)) {
    return { ...mem, layer: "memory", fromCache: true };
  }

  const local = readLocal(key);
  if (local && !isExpired(local.fetchedAt, ttl)) {
    memory.set(key, local);
    return { ...local, layer: "localStorage", fromCache: true };
  }

  return null;
}

export function writeCache(key, value, meta = {}) {
  const entry = {
    key,
    value,
    fetchedAt: meta.fetchedAt || nowIso(),
    ttlMs: meta.ttlMs ?? DATA_CACHE_TTL_MS,
    providerId: meta.providerId || null,
    count: meta.count || null,
  };
  memory.set(key, entry);
  writeLocal(key, entry);
  touchMeta(key, entry);
  return entry;
}

export function clearCache(key) {
  if (key) {
    memory.delete(key);
    removeLocalKey(key);
    return;
  }
  memory.clear();
  try {
    localStorage.removeItem(DATA_PLATFORM_CACHE_KEY);
    localStorage.removeItem(DATA_PLATFORM_CACHE_META_KEY);
  } catch {
    /* ignore */
  }
}

export function listCacheMeta() {
  try {
    const raw = localStorage.getItem(DATA_PLATFORM_CACHE_META_KEY);
    const parsed = safeJsonParse(raw, {});
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getCacheStats() {
  const meta = listCacheMeta();
  const keys = Object.keys(meta);
  return {
    memoryCount: memory.size,
    localCount: keys.length,
    total: Math.max(memory.size, keys.length),
    keys,
    updatedAt: keys.length
      ? keys.map((k) => meta[k]?.fetchedAt).sort().slice(-1)[0]
      : null,
  };
}

/** TTL 切れキャッシュを破棄（Ver10.6） */
export function purgeExpiredCache(now = Date.now()) {
  let removed = 0;
  const meta = listCacheMeta();
  for (const [key, info] of Object.entries(meta)) {
    const ttl = Number(info?.ttlMs) || DATA_CACHE_TTL_MS;
    if (isExpired(info?.fetchedAt, ttl) || isExpiredByNow(info?.fetchedAt, ttl, now)) {
      clearCache(key);
      removed += 1;
    }
  }
  for (const [key, entry] of [...memory.entries()]) {
    const ttl = Number(entry?.ttlMs) || DATA_CACHE_TTL_MS;
    if (isExpired(entry?.fetchedAt, ttl)) {
      memory.delete(key);
      removed += 1;
    }
  }
  return { removed, at: new Date().toISOString() };
}

function isExpiredByNow(fetchedAt, ttlMs, now) {
  if (!fetchedAt) return true;
  const t = Date.parse(fetchedAt);
  if (!Number.isFinite(t)) return true;
  return now - t > ttlMs;
}

function isExpired(fetchedAt, ttlMs) {
  if (!fetchedAt) return true;
  const t = Date.parse(fetchedAt);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > ttlMs;
}

function readStore() {
  try {
    const raw = localStorage.getItem(DATA_PLATFORM_CACHE_KEY);
    return safeJsonParse(raw, {}) || {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(DATA_PLATFORM_CACHE_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

function readLocal(key) {
  const store = readStore();
  return store[key] || null;
}

function writeLocal(key, entry) {
  const store = readStore();
  store[key] = entry;
  writeStore(store);
}

function removeLocalKey(key) {
  const store = readStore();
  delete store[key];
  writeStore(store);
  const meta = listCacheMeta();
  delete meta[key];
  try {
    localStorage.setItem(DATA_PLATFORM_CACHE_META_KEY, JSON.stringify(meta));
  } catch {
    /* ignore */
  }
}

function touchMeta(key, entry) {
  const meta = listCacheMeta();
  meta[key] = {
    fetchedAt: entry.fetchedAt,
    providerId: entry.providerId,
    ttlMs: entry.ttlMs,
    count: entry.count,
  };
  try {
    localStorage.setItem(DATA_PLATFORM_CACHE_META_KEY, JSON.stringify(meta));
  } catch {
    /* ignore */
  }
}

export const DataCacheManager = {
  read: readCache,
  write: writeCache,
  clear: clearCache,
  purgeExpired: purgeExpiredCache,
  stats: getCacheStats,
  listMeta: listCacheMeta,
};
