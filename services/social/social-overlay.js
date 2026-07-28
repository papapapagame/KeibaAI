/* ========================================
   Social Overlay — Ver8.1
   ======================================== */

const OVERLAY_KEY = "papapa_iq_social_overlay_v81";

let memoryOverlay = null;
let lastFingerprint = null;
let syncing = false;

export function beginSocialSync() {
  if (syncing) return false;
  syncing = true;
  return true;
}

export function endSocialSync() {
  syncing = false;
}

export function getSocialOverlay() {
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

export function setSocialOverlay(overlay) {
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

export function clearSocialOverlay() {
  setSocialOverlay(null);
  lastFingerprint = null;
}

export function getLastSocialFingerprint() {
  return lastFingerprint;
}

export function setLastSocialFingerprint(fp) {
  lastFingerprint = fp || null;
}
