/* ========================================
   Odds source mode — Ver10.2
   Mock / Real 手動切替（自動フォールバックなし）
   ======================================== */

export const ODDS_MODE_KEY = "papapa_iq_odds_mode_v102";
export const ODDS_MODES = ["mock", "real"];

export function getOddsMode() {
  try {
    const v = localStorage.getItem(ODDS_MODE_KEY);
    if (ODDS_MODES.includes(v)) return v;
  } catch {
    /* ignore */
  }
  return "real";
}

export function setOddsMode(mode) {
  const next = ODDS_MODES.includes(mode) ? mode : "real";
  try {
    localStorage.setItem(ODDS_MODE_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}

export const OddsMode = {
  get: getOddsMode,
  set: setOddsMode,
  key: ODDS_MODE_KEY,
  modes: ODDS_MODES,
};
