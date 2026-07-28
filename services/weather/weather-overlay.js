/* ========================================
   Weather Overlay — Ver7.9
   ======================================== */

const OVERLAY_KEY = "papapa_iq_weather_overlay_v79";

let memoryOverlay = null;
let lastFingerprint = null;
let syncing = false;

export function beginWeatherSync() {
  if (syncing) return false;
  syncing = true;
  return true;
}

export function endWeatherSync() {
  syncing = false;
}

export function getWeatherOverlay() {
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

export function setWeatherOverlay(overlay) {
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

export function clearWeatherOverlay() {
  setWeatherOverlay(null);
  lastFingerprint = null;
}

export function getLastWeatherFingerprint() {
  return lastFingerprint;
}

export function setLastWeatherFingerprint(fp) {
  lastFingerprint = fp || null;
}
