/* ========================================
   Horse Entry source mode — Ver10.1
   Mock / Real 手動切替（自動フォールバックなし）
   ======================================== */

export const ENTRY_MODE_KEY = "papapa_iq_entry_mode_v101";
export const ENTRY_MODES = ["mock", "real"];

export function getEntryMode() {
  try {
    const v = localStorage.getItem(ENTRY_MODE_KEY);
    if (ENTRY_MODES.includes(v)) return v;
  } catch {
    /* ignore */
  }
  return "mock";
}

export function setEntryMode(mode) {
  const next = ENTRY_MODES.includes(mode) ? mode : "mock";
  try {
    localStorage.setItem(ENTRY_MODE_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}

export const EntryMode = {
  get: getEntryMode,
  set: setEntryMode,
  key: ENTRY_MODE_KEY,
  modes: ENTRY_MODES,
};
