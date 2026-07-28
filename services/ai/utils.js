/* ========================================
   PAPAPA IQ KEIBA - AI utils
   Ver5.3 AI Intelligence Engine
   ======================================== */

export function clamp(value, min = 0, max = 100) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function toNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function avg(list) {
  const arr = (list || []).filter((v) => Number.isFinite(Number(v)));
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + Number(v), 0) / arr.length;
}

export function hashSeed(...parts) {
  const text = parts.map((p) => String(p ?? "")).join("|");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function pickVariant(seed, variants) {
  if (!variants || !variants.length) return "";
  return variants[seed % variants.length];
}

export function horseName(h) {
  return h?.name || h?.horse || `馬${h?.number || "?"}`;
}
