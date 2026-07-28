/* ========================================
   Race Data Synchronizer — Ver7.5
   Calendar / Smart Update 連携
   ======================================== */

import { emitEvent } from "../update/event-watcher.js";
import { fingerprintRaceConnect } from "./race-data-parser.js";

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

export function clearRaceConnectOverlay() {
  memoryOverlay = null;
  lastFingerprint = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * 開催日・開催場をカレンダーへ反映
 * @returns {{ changed: boolean, overlay: object|null, fingerprint: string }}
 */
export function syncRaceConnectToCalendar(parsed, options = {}) {
  const meetings = parsed?.meetings || [];
  const races = parsed?.races || [];
  const fp = fingerprintRaceConnect(races);
  const changed = fp !== lastFingerprint;

  const overlay = {
    version: "7.5.0",
    source: "race-connect",
    providerId: parsed?.providerId || "mock",
    updatedAt: new Date().toISOString(),
    meetings,
    races,
    raceStages: options.raceStages || {},
    fingerprint: fp,
  };

  memoryOverlay = overlay;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(overlay));
  } catch {
    /* ignore quota */
  }

  if (changed && options.emitUpdate !== false) {
    emitEvent({
      type: "meeting_update",
      detail: "Race Connect 同期",
      payload: {
        raceOnly: true,
        meetings: meetings.length,
        races: races.length,
        fingerprint: fp,
      },
      source: "race-connect",
    });
  }

  lastFingerprint = fp;
  return { changed, overlay, fingerprint: fp };
}

/**
 * meetings を Race Connect overlay でマージ
 * overlay が無い場合は base をそのまま返す
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

export function getLastRaceFingerprint() {
  return lastFingerprint || getRaceConnectOverlay()?.fingerprint || null;
}

export function setLastRaceFingerprint(fp) {
  lastFingerprint = fp || null;
}

export const RaceDataSynchronizer = {
  sync: syncRaceConnectToCalendar,
  getOverlay: getRaceConnectOverlay,
  clearOverlay: clearRaceConnectOverlay,
  mergeMeetings: mergeMeetingsWithOverlay,
  getFingerprint: getLastRaceFingerprint,
  setFingerprint: setLastRaceFingerprint,
};
