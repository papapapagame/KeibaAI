/* ========================================
   Social source mode — Ver10.5
   Mock / Real 手動切替（自動フォールバックなし）
   ======================================== */

export const SOCIAL_MODE_KEY = "papapa_iq_social_mode_v105";
export const SOCIAL_MODES = ["mock", "real"];

export function getSocialMode() {
  try {
    const v = localStorage.getItem(SOCIAL_MODE_KEY);
    if (SOCIAL_MODES.includes(v)) return v;
  } catch {
    /* ignore */
  }
  return "real";
}

export function setSocialMode(mode) {
  const next = SOCIAL_MODES.includes(mode) ? mode : "real";
  try {
    localStorage.setItem(SOCIAL_MODE_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}

export const SocialMode = {
  get: getSocialMode,
  set: setSocialMode,
  key: SOCIAL_MODE_KEY,
  modes: SOCIAL_MODES,
};
