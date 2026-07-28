/* ========================================
   News Overlay — Ver8.0
   ======================================== */

const OVERLAY_KEY = "papapa_iq_news_overlay_v80";

let memoryOverlay = null;
let lastFingerprint = null;
let syncing = false;

export function beginNewsSync() {
  if (syncing) return false;
  syncing = true;
  return true;
}

export function endNewsSync() {
  syncing = false;
}

export function getNewsOverlay() {
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

export function setNewsOverlay(overlay) {
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

export function clearNewsOverlay() {
  setNewsOverlay(null);
  lastFingerprint = null;
}

export function getLastNewsFingerprint() {
  return lastFingerprint;
}

export function setLastNewsFingerprint(fp) {
  lastFingerprint = fp || null;
}
