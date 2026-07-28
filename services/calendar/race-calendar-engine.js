/* ========================================
   RaceCalendarEngine — Ver7.1
   ======================================== */

import { API_BASE_URL } from "../../js/config.js";
import { getCalendarMode, setCalendarMode } from "./calendar-mode.js";
import {
  listMeetingDates,
  isMeetingDate,
  getMeetingByDate,
  getDateRange,
  buildMonthCells,
} from "./race-date-manager.js";
import { listVenuesForDate, getVenueSession } from "./venue-manager.js";
import {
  buildSession,
  buildSessionWithRaceStage,
  resolveRaceStage,
} from "./race-session-manager.js";
import {
  validateCalendarPayload,
  validateDateSelection,
  validateVenueSelection,
} from "./calendar-validator.js";
import { buildStageContext, sanitizeForStage } from "./stage-evaluation.js";
import {
  createRaceDate,
  CALENDAR_MODEL_VERSION,
} from "./models.js";
import {
  mergeMeetingsWithOverlay,
  getRaceConnectOverlay,
} from "../race-connect/race-data-synchronizer.js";

const PLATFORM_VERSION = "7.1.0";
let cachedPayload = null;
let lastError = null;

export async function loadCalendar(options = {}) {
  const mode = options.mode || getCalendarMode();
  const overlay = getRaceConnectOverlay();

  // Ver7.5 Real: Race Connect 経由の開催情報があれば利用
  if (mode === "real") {
    if (overlay?.meetings?.length) {
      lastError = null;
      cachedPayload = {
        meetings: overlay.meetings,
        raceStages: overlay.raceStages || {},
        source: "race-connect",
        updatedAt: overlay.updatedAt,
      };
      return {
        ok: true,
        mode,
        blocked: false,
        message: "Race Connect Calendar",
        meetings: overlay.meetings,
        raceStages: overlay.raceStages || {},
        validation: { ok: true, errors: [], warnings: [] },
        source: "race-connect",
        updatedAt: overlay.updatedAt || null,
        version: PLATFORM_VERSION,
        modelVersion: CALENDAR_MODEL_VERSION,
        raceConnect: true,
      };
    }
    lastError = "Provider未接続";
    return {
      ok: false,
      mode,
      blocked: true,
      message: "Provider未接続（Real Calendar / Race Connect 未取得）",
      meetings: [],
      raceStages: {},
      validation: { ok: false, errors: [{ code: "NOT_CONNECTED", message: "Provider未接続" }], warnings: [] },
      version: PLATFORM_VERSION,
    };
  }

  try {
    const payload = await fetchMockCalendar();
    const validation = validateCalendarPayload(payload);
    if (!validation.ok) {
      lastError = validation.errors.map((e) => e.message).join("; ");
      return {
        ok: false,
        mode,
        blocked: false,
        message: lastError,
        meetings: [],
        raceStages: {},
        validation,
        version: PLATFORM_VERSION,
      };
    }

    const meetings = mergeMeetingsWithOverlay(payload.meetings || []);
    cachedPayload = { ...payload, meetings };
    lastError = null;
    return {
      ok: true,
      mode,
      blocked: false,
      message: overlay ? "Mock Calendar + Race Connect" : "Mock Calendar",
      meetings,
      raceStages: {
        ...(payload.raceStages || {}),
        ...(overlay?.raceStages || {}),
      },
      validation,
      source: overlay ? "mock+race-connect" : payload.source || "mock",
      updatedAt: overlay?.updatedAt || payload.updatedAt || null,
      version: PLATFORM_VERSION,
      modelVersion: CALENDAR_MODEL_VERSION,
      raceConnect: Boolean(overlay),
    };
  } catch (error) {
    lastError = error?.message || String(error);
    return {
      ok: false,
      mode,
      blocked: false,
      message: lastError,
      meetings: [],
      raceStages: {},
      validation: { ok: false, errors: [{ code: "FETCH", message: lastError }], warnings: [] },
      version: PLATFORM_VERSION,
    };
  }
}

async function fetchMockCalendar() {
  const url = `${API_BASE_URL}calendar/mock-calendar.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Mock calendar fetch failed (${res.status})`);
  return res.json();
}

export async function getCalendarDashboard(options = {}) {
  const cal = await loadCalendar(options);
  const meetingDates = listMeetingDates(cal.meetings);
  const range = getDateRange(cal.meetings);
  return {
    ...cal,
    meetingDates,
    range,
    meetingDateSet: new Set(meetingDates.map((d) => d.date)),
  };
}

export function getVenuesOnDate(meetings, date) {
  return listVenuesForDate(meetings, date);
}

export function getSessionInfo(meetings, date, venueId) {
  return buildSession(meetings, date, venueId);
}

export function getRaceAnalysisContext({
  meetings,
  raceStages,
  date,
  venueId,
  raceNumber,
}) {
  const session = buildSessionWithRaceStage(
    meetings,
    date,
    venueId,
    raceNumber,
    raceStages
  );
  const stage = session?.analysisStage?.stage ?? 0;
  const stageCtx = buildStageContext(stage);
  return {
    session,
    ...stageCtx,
  };
}

export function prepareAiInput(race, horses, stage) {
  return sanitizeForStage(race, horses, stage);
}

export {
  getCalendarMode,
  setCalendarMode,
  listMeetingDates,
  isMeetingDate,
  getMeetingByDate,
  getDateRange,
  buildMonthCells,
  listVenuesForDate,
  getVenueSession,
  buildSession,
  buildSessionWithRaceStage,
  resolveRaceStage,
  validateDateSelection,
  validateVenueSelection,
  validateCalendarPayload,
  buildStageContext,
  sanitizeForStage,
  createRaceDate,
};

export const RaceCalendarEngine = {
  load: loadCalendar,
  dashboard: getCalendarDashboard,
  getVenuesOnDate,
  getSessionInfo,
  getRaceAnalysisContext,
  prepareAiInput,
  version: PLATFORM_VERSION,
};
