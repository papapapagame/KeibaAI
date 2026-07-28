/* ========================================
   RaceCalendarSynchronizer — Ver10.0
   変更時のみ同期。Smart Update 連携。
   ======================================== */

import { emitEvent } from "../../update/event-watcher.js";
import {
  getRaceConnectOverlay,
  setRaceConnectOverlay,
  getLastRaceFingerprint,
  setLastRaceFingerprint,
} from "../../race-connect/race-connect-overlay.js";
import { normalizeRaceCalendar } from "./race-calendar-normalizer.js";
import { validateRaceCalendar } from "./race-calendar-validator.js";

export const RACE_CALENDAR_SYNC_VERSION = "10.0.0";
export const REAL_RACE_STORE_KEY = "papapa_iq_real_race_calendar_v10";

let memoryState = null;
let syncing = false;

export function getRealRaceState() {
  if (memoryState) return memoryState;
  try {
    const raw = sessionStorage.getItem(REAL_RACE_STORE_KEY);
    if (!raw) return null;
    memoryState = JSON.parse(raw);
    return memoryState;
  } catch {
    return null;
  }
}

export function setRealRaceState(state) {
  memoryState = state || null;
  try {
    if (!state) sessionStorage.removeItem(REAL_RACE_STORE_KEY);
    else sessionStorage.setItem(REAL_RACE_STORE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
  return memoryState;
}

export function clearRealRaceState() {
  memoryState = null;
  try {
    sessionStorage.removeItem(REAL_RACE_STORE_KEY);
  } catch {
    /* ignore */
  }
}

export function fingerprintRealCalendar(meetings = [], races = []) {
  const m = (meetings || [])
    .map((x) => {
      const venues = (x.venues || [])
        .map(
          (v) =>
            `${v.venueId}:${v.kai}-${v.day}-${v.totalDays}-${v.status}-${v.defaultStage}`
        )
        .sort()
        .join(",");
      return `${x.date}|${venues}`;
    })
    .sort()
    .join(";");
  const r = (races || [])
    .map(
      (x) =>
        `${x.date}|${x.venueId}|${x.number}|${x.startTime || x.time}|${x.distance}|${x.raceName || x.name}`
    )
    .sort()
    .join(";");
  return `v10:${simpleHash(`${m}#${r}`)}`;
}

/**
 * 検証済みデータを Unified / Overlay / Smart Update へ同期
 * 変更が無い場合は再同期しない
 */
export function syncRaceCalendar(parsed, options = {}) {
  if (syncing) {
    return {
      ok: false,
      changed: false,
      skipped: true,
      reason: "re-entrancy",
      state: getRealRaceState(),
    };
  }

  syncing = true;
  try {
    const validation = options.validation || validateRaceCalendar(parsed);
    if (!validation.ok) {
      return {
        ok: false,
        changed: false,
        skipped: false,
        reason: "validation_failed",
        validation,
        message: "現在データを取得できません",
        state: getRealRaceState(),
      };
    }

    const accepted = {
      ...parsed,
      meetings: validation.acceptedMeetings,
      races: validation.acceptedRaces,
    };
    const normalized = normalizeRaceCalendar(accepted);
    const fp = fingerprintRealCalendar(
      accepted.meetings,
      accepted.races
    );
    const prevFp =
      getRealRaceState()?.fingerprint || getLastRaceFingerprint();
    const changed = Boolean(options.force) || fp !== prevFp;

    if (!changed && getRealRaceState() && !options.force) {
      return {
        ok: true,
        changed: false,
        skipped: true,
        reason: "unchanged",
        fingerprint: fp,
        validation,
        normalized: getRealRaceState()?.normalized || normalized,
        state: getRealRaceState(),
        message: "開催情報に変更なし（再取得スキップ）",
      };
    }

    const state = {
      version: RACE_CALENDAR_SYNC_VERSION,
      source: "real-race",
      providerId: parsed.providerId || "real-race",
      updatedAt: new Date().toISOString(),
      fingerprint: fp,
      meetings: accepted.meetings,
      races: accepted.races,
      legacyRaces: normalized.legacyRaces,
      raceStages: accepted.raceStages || {},
      calendar: normalized.calendar,
      schedules: normalized.schedules,
      venues: normalized.venues,
      unifiedRaces: normalized.races,
      validation: {
        ok: validation.ok,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
        rejectedRaceCount: validation.rejectedRaceCount,
      },
      normalized,
    };

    setRealRaceState(state);

    // Calendar Real モードが参照する overlay にも反映
    setRaceConnectOverlay({
      version: "10.0.0",
      source: "real-race",
      providerId: state.providerId,
      updatedAt: state.updatedAt,
      meetings: state.meetings,
      races: state.races,
      raceStages: state.raceStages,
      fingerprint: fp,
    });
    setLastRaceFingerprint(fp);

    const allowEmit =
      changed &&
      options.emitUpdate === true &&
      prevFp != null &&
      !options.silent;

    if (allowEmit) {
      emitEvent({
        type: "meeting_update",
        detail: "Real Race Calendar 同期",
        payload: {
          raceOnly: true,
          meetings: state.meetings.length,
          races: state.races.length,
          fingerprint: fp,
          providerId: state.providerId,
        },
        source: "real-race",
      });
    }

    return {
      ok: true,
      changed,
      skipped: false,
      fingerprint: fp,
      validation,
      normalized,
      state,
      overlay: getRaceConnectOverlay(),
      message: changed ? "Real Race Calendar 同期完了" : "変更なし",
    };
  } finally {
    syncing = false;
  }
}

export function getRealRaceDashboard() {
  const state = getRealRaceState();
  if (!state) {
    return {
      available: false,
      providerId: null,
      status: "idle",
      meetingCount: 0,
      raceCount: 0,
      updatedAt: null,
      validation: null,
      syncStatus: "—",
    };
  }
  return {
    available: true,
    providerId: state.providerId,
    status: "ready",
    meetingCount: state.meetings?.length || 0,
    raceCount: state.races?.length || 0,
    updatedAt: state.updatedAt,
    validation: state.validation,
    syncStatus: "synced",
    fingerprint: state.fingerprint,
    source: state.source,
  };
}

export function listRealRacesFor(date, venueId) {
  const state = getRealRaceState();
  const races = state?.legacyRaces || state?.races || [];
  return races
    .filter((r) => {
      const dateOk = !date || r.date === date;
      const venueOk =
        !venueId || r.venue === venueId || r.venueId === venueId;
      return dateOk && venueOk;
    })
    .slice()
    .sort((a, b) => {
      const n = (Number(a.number) || 0) - (Number(b.number) || 0);
      if (n !== 0) return n;
      return String(a.time || a.startTime || "").localeCompare(
        String(b.time || b.startTime || "")
      );
    });
}

function simpleHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export const RaceCalendarSynchronizer = {
  sync: syncRaceCalendar,
  getState: getRealRaceState,
  setState: setRealRaceState,
  clear: clearRealRaceState,
  fingerprint: fingerprintRealCalendar,
  dashboard: getRealRaceDashboard,
  listRaces: listRealRacesFor,
  version: RACE_CALENDAR_SYNC_VERSION,
};
