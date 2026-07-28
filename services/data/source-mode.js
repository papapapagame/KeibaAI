/* ========================================
   Source Mode (Mock / Real / Auto) — Ver7.0
   ======================================== */

export const SOURCE_MODE_KEY = "papapa_iq_data_source_mode_v1081";
export const SOURCE_MODES = ["mock", "real", "auto"];

export function getSourceMode() {
  try {
    const v = localStorage.getItem(SOURCE_MODE_KEY);
    if (SOURCE_MODES.includes(v)) return v;
  } catch {
    /* ignore */
  }
  return "real";
}

export function setSourceMode(mode) {
  const next = SOURCE_MODES.includes(mode) ? mode : "real";
  try {
    localStorage.setItem(SOURCE_MODE_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}
