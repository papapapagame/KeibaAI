/* ========================================
   Odds Overlay Store — Ver7.8
   ======================================== */

const OVERLAY_KEY = "papapa_iq_odds_overlay_v78";

let memoryOverlay = null;
let lastFingerprint = null;
let syncing = false;

export function beginOddsSync() {
  if (syncing) return false;
  syncing = true;
  return true;
}

export function endOddsSync() {
  syncing = false;
}

export function getOddsOverlay() {
  if (memoryOverlay) return memoryOverlay;
  try {
    const raw = sessionStorage.getItem(OVERLAY_KEY);
    if (!raw) return null;
    memoryOverlay = JSON.parse(raw);
    return memoryOverlay;
  } catch {
    return null;
  }
}

export function setOddsOverlay(overlay) {
  memoryOverlay = overlay || null;
  if (!overlay) {
    try {
      sessionStorage.removeItem(OVERLAY_KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    sessionStorage.setItem(OVERLAY_KEY, JSON.stringify(overlay));
  } catch {
    /* ignore */
  }
}

export function clearOddsOverlay() {
  setOddsOverlay(null);
  lastFingerprint = null;
}

export function getLastOddsFingerprint() {
  return lastFingerprint;
}

export function setLastOddsFingerprint(fp) {
  lastFingerprint = fp || null;
}
