/* ========================================
   PAPAPA IQ KEIBA - Intelligence Cache
   Ver5.2 Real Intelligence Connect
   TTL / 更新日時 / 差分更新
   ======================================== */

import { DATA_CACHE_TTL_MS } from "../../../js/config.js";

const CACHE_PREFIX = "papapa_iq_intel_cache_v52_";
const META_KEY = "papapa_iq_intel_cache_meta_v52";

export function getCacheTtlMs() {
  return Number(DATA_CACHE_TTL_MS) || 10 * 60 * 1000;
}

export function readIntelCache(providerId) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + providerId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.fetchedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isCacheExpired(entry, ttlMs = getCacheTtlMs()) {
  if (!entry?.fetchedAt) return true;
  const t = Date.parse(entry.fetchedAt);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > ttlMs;
}

/**
 * 差分判定用ハッシュ（簡易）
 */
export function hashItems(items = []) {
  const text = JSON.stringify(items);
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

/**
 * キャッシュ書き込み。同一ハッシュなら差分なしとして更新日時のみ延長可。
 * @returns {{ written: boolean, unchanged: boolean, entry: object }}
 */
export function writeIntelCache(providerId, payload = {}) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const contentHash = payload.contentHash || hashItems(items);
  const prev = readIntelCache(providerId);
  const unchanged = Boolean(prev && prev.contentHash === contentHash);
  const fetchedAt = payload.fetchedAt || new Date().toISOString();
  const entry = {
    providerId,
    items,
    count: items.length,
    fetchedAt,
    expiresAt: new Date(Date.parse(fetchedAt) + getCacheTtlMs()).toISOString(),
    contentHash,
    unchanged,
    meta: payload.meta || null,
  };

  try {
    localStorage.setItem(CACHE_PREFIX + providerId, JSON.stringify(entry));
    touchMeta(providerId, entry);
  } catch {
    /* ignore quota */
  }

  return { written: true, unchanged, entry };
}

export function clearIntelCache(providerId) {
  try {
    if (providerId) {
      localStorage.removeItem(CACHE_PREFIX + providerId);
      removeMeta(providerId);
      return;
    }
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(META_KEY);
  } catch {
    /* ignore */
  }
}

export function listIntelCacheMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function touchMeta(providerId, entry) {
  const list = listIntelCacheMeta().filter((x) => x.providerId !== providerId);
  list.unshift({
    providerId,
    fetchedAt: entry.fetchedAt,
    expiresAt: entry.expiresAt,
    count: entry.count,
    contentHash: entry.contentHash,
    unchanged: entry.unchanged,
  });
  try {
    localStorage.setItem(META_KEY, JSON.stringify(list.slice(0, 30)));
  } catch {
    /* ignore */
  }
}

function removeMeta(providerId) {
  const list = listIntelCacheMeta().filter((x) => x.providerId !== providerId);
  try {
    localStorage.setItem(META_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
