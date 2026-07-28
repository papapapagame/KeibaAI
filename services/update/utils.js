/* ========================================
   Update utils — Ver7.2
   ======================================== */

export function nowIso() {
  return new Date().toISOString();
}

export function toNum(v, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

export function safeParse(raw, fb = null) {
  try {
    return JSON.parse(raw);
  } catch {
    return fb;
  }
}

export function formatJa(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ja-JP");
  } catch {
    return String(iso);
  }
}

export function hashSnapshot(obj) {
  const text = JSON.stringify(obj ?? {});
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h << 5) - h + text.charCodeAt(i);
    h |= 0;
  }
  return String(Math.abs(h));
}
