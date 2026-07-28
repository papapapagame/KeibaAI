/* ========================================
   Race Connect Overlay Store — Ver7.6.1
   イベント非依存。Calendar はここだけ参照する。
   ======================================== */

const STORAGE_KEY = "papapa_iq_race_connect_overlay_v75";

let memoryOverlay = null;
let lastFingerprint = null;

export function getRaceConnectOverlay() {
  if (memoryOverlay) return memoryOverlay;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    memoryOverlay = JSON.parse(raw);
    return memoryOverlay;
  } catch {
    return null;
  }
}

export function setRaceConnectOverlay(overlay) {
  memoryOverlay = overlay || null;
  if (!overlay) {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(overlay));
  } catch {
    /* ignore quota */
  }
  return memoryOverlay;
}

export function clearRaceConnectOverlay() {
  memoryOverlay = null;
  lastFingerprint = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getLastRaceFingerprint() {
  return lastFingerprint || getRaceConnectOverlay()?.fingerprint || null;
}

export function setLastRaceFingerprint(fp) {
  lastFingerprint = fp || null;
}

/**
 * meetings を Race Connect overlay でマージ（純関数・イベントなし）
 */
export function mergeMeetingsWithOverlay(baseMeetings = []) {
  const overlay = getRaceConnectOverlay();
  if (!overlay?.meetings?.length) return baseMeetings || [];

  const map = new Map();
  for (const m of baseMeetings || []) {
    map.set(m.date, {
      date: m.date,
      venues: [...(m.venues || [])],
    });
  }
  for (const m of overlay.meetings) {
    if (!map.has(m.date)) {
      map.set(m.date, { date: m.date, venues: [...(m.venues || [])] });
      continue;
    }
    const cur = map.get(m.date);
    const byId = new Map((cur.venues || []).map((v) => [v.venueId, v]));
    for (const v of m.venues || []) {
      byId.set(v.venueId, { ...(byId.get(v.venueId) || {}), ...v });
    }
    cur.venues = [...byId.values()];
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}
