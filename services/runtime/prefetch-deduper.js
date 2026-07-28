/* ========================================
   Prefetch Deduper — Ver9.0 RC
   同一キーの重複取得を防止
   ======================================== */

const memory = new Map();
const DEFAULT_TTL = 60 * 1000;

export function shouldPrefetch(key, ttlMs = DEFAULT_TTL) {
  const k = String(key || "");
  if (!k) return true;
  const now = Date.now();
  const prev = memory.get(k);
  if (prev && now - prev < ttlMs) return false;
  memory.set(k, now);
  // prune
  if (memory.size > 80) {
    for (const [id, t] of memory) {
      if (now - t > ttlMs * 2) memory.delete(id);
    }
  }
  return true;
}

export function clearPrefetchMemory() {
  memory.clear();
}

export const PrefetchDeduper = {
  should: shouldPrefetch,
  clear: clearPrefetchMemory,
};
