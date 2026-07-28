/* ========================================
   Data Platform utils — Ver7.0
   ======================================== */

export function clamp(v, min = 0, max = 100) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function toNum(v, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

export function toStr(v, fb = "") {
  if (v == null) return fb;
  return String(v).trim();
}

export function nowIso() {
  return new Date().toISOString();
}

export function safeJsonParse(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
