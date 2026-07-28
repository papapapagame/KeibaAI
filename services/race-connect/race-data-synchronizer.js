/* ========================================
   Race Data Synchronizer — Ver7.5 / 7.6.1
   変更時のみ通知。再入禁止。
   ======================================== */

import { emitEvent } from "../update/event-watcher.js";
import { fingerprintRaceConnect } from "./race-data-parser.js";
import {
  getRaceConnectOverlay,
  setRaceConnectOverlay,
  clearRaceConnectOverlay,
  getLastRaceFingerprint,
  setLastRaceFingerprint,
  mergeMeetingsWithOverlay,
} from "./race-connect-overlay.js";

let syncing = false;

/**
 * 開催日・開催場をカレンダーへ反映
 * @returns {{ changed: boolean, overlay: object|null, fingerprint: string }}
 */
export function syncRaceConnectToCalendar(parsed, options = {}) {
  if (syncing) {
    return {
      changed: false,
      overlay: getRaceConnectOverlay(),
      fingerprint: getLastRaceFingerprint(),
      skipped: true,
      reason: "re-entrancy",
    };
  }

  syncing = true;
  try {
    const meetings = parsed?.meetings || [];
    const races = parsed?.races || [];
    const fp = fingerprintRaceConnect(races);
    const prevFp = getLastRaceFingerprint();
    const changed = Boolean(options.force) || fp !== prevFp;

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

    setRaceConnectOverlay(overlay);
    setLastRaceFingerprint(fp);

    // 変更が無い、または silent / 初回ロードでは通知しない
    const allowEmit =
      changed &&
      options.emitUpdate === true &&
      prevFp != null &&
      !options.silent;

    if (allowEmit) {
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

    return { changed, overlay, fingerprint: fp };
  } finally {
    syncing = false;
  }
}

export {
  getRaceConnectOverlay,
  clearRaceConnectOverlay,
  mergeMeetingsWithOverlay,
  getLastRaceFingerprint,
  setLastRaceFingerprint,
};

export const RaceDataSynchronizer = {
  sync: syncRaceConnectToCalendar,
  getOverlay: getRaceConnectOverlay,
  clearOverlay: clearRaceConnectOverlay,
  mergeMeetings: mergeMeetingsWithOverlay,
  getFingerprint: getLastRaceFingerprint,
  setFingerprint: setLastRaceFingerprint,
};
