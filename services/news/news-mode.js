/* ========================================
   News source mode — Ver10.4
   Mock / Real 手動切替（自動フォールバックなし）
   ======================================== */

export const NEWS_MODE_KEY = "papapa_iq_news_mode_v104";
export const NEWS_MODES = ["mock", "real"];

export function getNewsMode() {
  try {
    const v = localStorage.getItem(NEWS_MODE_KEY);
    if (NEWS_MODES.includes(v)) return v;
  } catch {
    /* ignore */
  }
  return "real";
}

export function setNewsMode(mode) {
  const next = NEWS_MODES.includes(mode) ? mode : "real";
  try {
    localStorage.setItem(NEWS_MODE_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}

export const NewsMode = {
  get: getNewsMode,
  set: setNewsMode,
  key: NEWS_MODE_KEY,
  modes: NEWS_MODES,
};
