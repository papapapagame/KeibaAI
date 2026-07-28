/* ========================================
   Review utils — Ver6.5
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

export function horseName(h) {
  return h?.name || h?.horse || `馬${h?.number ?? h?.horseId ?? "?"}`;
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

export function sortByFinish(entries) {
  return [...(entries || [])].sort(
    (a, b) => toNum(a.finish, 99) - toNum(b.finish, 99)
  );
}

export function popularHorses(entries, maxPop = 3) {
  return (entries || []).filter((e) => toNum(e.popularity, 99) <= maxPop);
}
