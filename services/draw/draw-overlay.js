/* ========================================
   Draw Overlay Store — Ver7.7
   ======================================== */

const OVERLAY_KEY = "papapa_iq_draw_overlay_v77";

let memoryOverlay = null;
let lastFingerprint = null;
let syncing = false;

export function beginDrawSync() {
  if (syncing) return false;
  syncing = true;
  return true;
}

export function endDrawSync() {
  syncing = false;
}

export function getDrawOverlay() {
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

export function setDrawOverlay(overlay) {
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

export function clearDrawOverlay() {
  setDrawOverlay(null);
  lastFingerprint = null;
}

export function getLastDrawFingerprint() {
  return lastFingerprint;
}

export function setLastDrawFingerprint(fp) {
  lastFingerprint = fp || null;
}
