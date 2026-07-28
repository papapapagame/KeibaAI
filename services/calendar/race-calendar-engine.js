/* ========================================
   RaceCalendarEngine — Ver7.1 / Ver10.0
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
} from "../race-connect/race-connect-overlay.js";
import {
  loadRealRaceCalendar,
  getRealRaceState,
  getRealRaceDashboard,
} from "../provider/race/index.js";

const PLATFORM_VERSION = "10.0.0";
let cachedPayload = null;
let lastError = null;
let lastProviderKind = "mock";

export async function loadCalendar(options = {}) {
  const mode = options.mode || getCalendarMode();
  lastProviderKind = mode === "real" ? "real" : "mock";

  // Ver10.0 Real Race Calendar（Mock へ自動フォールバックしない）
  if (mode === "real") {
    const real = await loadRealRaceCalendar({
      force: options.force,
      silent: options.silent !== false,
      emitUpdate: options.emitUpdate === true,
      url: options.url,
    });

    if (!real.ok) {
      lastError = real.userMessage || real.message || "現在実データを取得できません";
      cachedPayload = null;
      return {
        ok: false,
        mode,
        blocked: false,
        message: lastError,
        userMessage: "現在実データを取得できません",
        meetings: [],
        raceStages: {},
        races: [],
        validation: real.validation || {
          ok: false,
          errors: [{ code: "REAL_UNAVAILABLE", message: lastError }],
          warnings: [],
        },
        providerId: real.providerId || "real-race",
        providerKind: "real",
        source: "real-race",
        error: real.error || null,
        version: PLATFORM_VERSION,
        modelVersion: CALENDAR_MODEL_VERSION,
      };
    }

    lastError = null;
    cachedPayload = {
      meetings: real.meetings,
      raceStages: real.raceStages || {},
      races: real.legacyRaces || real.races || [],
      source: "real-race",
      updatedAt: real.updatedAt || real.fetchedAt,
      calendar: real.calendar,
      schedules: real.schedules,
    };

    return {
      ok: true,
      mode,
      blocked: false,
      message: real.message || "Real Race Calendar",
      meetings: real.meetings,
      raceStages: real.raceStages || {},
      races: real.legacyRaces || real.races || [],
      calendar: real.calendar,
      schedules: real.schedules,
      validation: real.validation || { ok: true, errors: [], warnings: [] },
      providerId: real.providerId || "real-race",
      providerKind: "real",
      source: "real-race",
      updatedAt: real.updatedAt || real.fetchedAt || null,
      skipped: Boolean(real.skipped),
      changed: Boolean(real.changed),
      fingerprint: real.fingerprint,
      version: PLATFORM_VERSION,
      modelVersion: CALENDAR_MODEL_VERSION,
      raceConnect: true,
      realRace: true,
    };
  }

  // Mock（従来どおり）。Race Connect / Real overlay があればマージ
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
        providerId: "mock",
        providerKind: "mock",
        version: PLATFORM_VERSION,
      };
    }

    const overlay = getRaceConnectOverlay();
    const meetings = mergeMeetingsWithOverlay(payload.meetings || []);
    cachedPayload = { ...payload, meetings };
    lastError = null;
    return {
      ok: true,
      mode,
      blocked: false,
      message: overlay ? "Mock Calendar + Overlay" : "Mock Calendar",
      meetings,
      raceStages: {
        ...(payload.raceStages || {}),
        ...(overlay?.raceStages || {}),
      },
      races: overlay?.races || [],
      validation,
      providerId: "mock",
      providerKind: "mock",
      source: overlay ? "mock+overlay" : payload.source || "mock",
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
      providerId: "mock",
      providerKind: "mock",
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
  const realDash = getRealRaceDashboard();
  return {
    ...cal,
    meetingDates,
    range,
    meetingDateSet: new Set(meetingDates.map((d) => d.date)),
    realRaceDashboard: realDash,
    lastProviderKind,
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

export function getCachedCalendarPayload() {
  return cachedPayload;
}

export function getLastCalendarError() {
  return lastError;
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
  getRealRaceState,
  getRealRaceDashboard,
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
