/* ========================================
   format helpers — Ver7.0
   ======================================== */

export function formatUpdateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ja-JP");
  } catch {
    return String(iso);
  }
}
