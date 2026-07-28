/* ========================================
   Calendar source mode — Ver7.1
   ======================================== */

export const CALENDAR_MODE_KEY = "papapa_iq_calendar_mode_v1081";
export const CALENDAR_MODES = ["mock", "real"];

export function getCalendarMode() {
  try {
    const v = localStorage.getItem(CALENDAR_MODE_KEY);
    if (CALENDAR_MODES.includes(v)) return v;
  } catch {
    /* ignore */
  }
  return "real";
}

export function setCalendarMode(mode) {
  const next = CALENDAR_MODES.includes(mode) ? mode : "real";
  try {
    localStorage.setItem(CALENDAR_MODE_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}
