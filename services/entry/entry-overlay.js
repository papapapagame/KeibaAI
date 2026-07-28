/* ========================================
   Entry Overlay Store — Ver7.6.1
   イベント非依存の永続オーバーレイ
   ======================================== */

const OVERLAY_KEY = "papapa_iq_entry_overlay_v76";

let memoryOverlay = null;
let lastFingerprint = null;
let syncing = false;

export function isEntrySyncing() {
  return syncing;
}

export function beginEntrySync() {
  if (syncing) return false;
  syncing = true;
  return true;
}

export function endEntrySync() {
  syncing = false;
}

export function getEntryOverlay() {
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

export function setEntryOverlay(overlay) {
  memoryOverlay = overlay || null;
  if (!overlay) {
    try {
      sessionStorage.removeItem(OVERLAY_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
  try {
    sessionStorage.setItem(OVERLAY_KEY, JSON.stringify(overlay));
  } catch {
    /* ignore */
  }
  return memoryOverlay;
}

export function clearEntryOverlay() {
  memoryOverlay = null;
  lastFingerprint = null;
  try {
    sessionStorage.removeItem(OVERLAY_KEY);
  } catch {
    /* ignore */
  }
}

export function getLastEntryFingerprint() {
  return lastFingerprint || getEntryOverlay()?.fingerprint || null;
}

export function setLastEntryFingerprint(fp) {
  lastFingerprint = fp || null;
}
