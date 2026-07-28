/* ========================================
   RaceCalendarNormalizer — Ver10.0
   中間構造 → Unified Model 向け正規化
   ======================================== */

import {
  createRace,
  createVenue,
  createCalendar,
  createSchedule,
  createAnalysisStageRef,
  UNIFIED_VERSION,
} from "../../models/unified.js";
import {
  createRaceVenue,
  createAnalysisStage,
} from "../../calendar/models.js";

export const RACE_CALENDAR_NORMALIZER_VERSION = "10.0.0";

/**
 * パース結果を Unified Calendar / Race / Schedule へ正規化
 */
export function normalizeRaceCalendar(parsed = {}) {
  const meetings = (parsed.meetings || []).map((m) => ({
    date: m.date,
    venues: (m.venues || []).map((v) => createRaceVenue(v)),
  }));

  const races = (parsed.races || []).map((r) =>
    createRace(
      {
        date: r.date,
        venueId: r.venueId,
        venue: r.venueId,
        venueLabel: r.venueLabel,
        kai: r.kai,
        day: r.day,
        number: r.number,
        raceId: r.raceId || null,
        raceName: r.raceName,
        name: r.raceName,
        distance: r.distance,
        surface: r.surface,
        track: r.surface,
        startTime: r.startTime,
        time: r.startTime,
        courseDirection: r.courseDirection,
        courseLoop: r.courseLoop,
        grade: r.grade,
        raceClass: r.raceClass,
        ageCondition: r.ageCondition,
        fieldSize: r.fieldSize,
        weather: r.weather,
        trackCondition: r.trackCondition,
        prize: r.prize,
        analysisStage: r.defaultStage,
        stage: r.defaultStage,
      },
      []
    )
  );

  const venues = uniqueVenues(meetings, races);
  const schedules = meetings.flatMap((m) =>
    (m.venues || []).map((v) =>
      createSchedule({
        date: m.date,
        venue: v,
        kai: v.kai,
        day: v.day,
        totalDays: v.totalDays,
        isFinalDay: v.isFinalDay,
        status: v.status,
        analysisStage: v.defaultStage,
        raceCount: races.filter(
          (r) => r.date === m.date && r.venueId === v.venueId
        ).length,
      })
    )
  );

  const calendar = createCalendar({
    meetings,
    venues,
    schedules,
    races,
    source: parsed.source || "real",
    providerId: parsed.providerId || "real-race",
    updatedAt: parsed.updatedAt || parsed.parsedAt || null,
  });

  // AI / UI 互換の平坦レース（race-list 用）
  const legacyRaces = (parsed.races || [])
    .map((r) => ({
      date: r.date,
      venue: r.venueId,
      venueId: r.venueId,
      venueLabel: r.venueLabel,
      kai: r.kai,
      day: r.day,
      totalDays: r.totalDays,
      number: r.number,
      raceId: r.raceId || null,
      name: r.raceName,
      raceName: r.raceName,
      time: r.startTime,
      startTime: r.startTime,
      distance: r.distance,
      track: r.surface,
      surface: r.surface,
      courseDirection: r.courseDirection,
      raceClass: r.raceClass,
      condition: r.raceClass,
      grade: r.grade,
      ageCondition: r.ageCondition,
      fieldSize: r.fieldSize,
      weather: r.weather,
      trackCondition: r.trackCondition,
      turfCondition: r.turfCondition || "",
      dirtCondition: r.dirtCondition || "",
      courseLoop: r.courseLoop,
      prize: r.prize,
      stage: r.defaultStage,
      sourceUrl: r.sourceUrl || null,
    }))
    .sort(compareRaceOrder);

  return {
    modelVersion: UNIFIED_VERSION,
    normalizerVersion: RACE_CALENDAR_NORMALIZER_VERSION,
    providerId: parsed.providerId || "real-race",
    calendar,
    meetings,
    venues,
    schedules,
    races,
    legacyRaces,
    raceStages: parsed.raceStages || {},
    analysisStages: schedules.map((s) =>
      createAnalysisStage(s.analysisStage?.stage ?? s.analysisStage)
    ),
    normalizedAt: new Date().toISOString(),
  };
}

function uniqueVenues(meetings, races) {
  const map = new Map();
  for (const m of meetings) {
    for (const v of m.venues || []) {
      map.set(v.venueId, createVenue(v));
    }
  }
  for (const r of races) {
    if (r.venueId && !map.has(r.venueId)) {
      map.set(r.venueId, createVenue(r));
    }
  }
  return [...map.values()];
}

export function compareRaceOrder(a, b) {
  const n = (Number(a.number) || 0) - (Number(b.number) || 0);
  if (n !== 0) return n;
  return String(a.time || a.startTime || "").localeCompare(
    String(b.time || b.startTime || "")
  );
}

export const RaceCalendarNormalizer = {
  normalize: normalizeRaceCalendar,
  compareRaceOrder,
  version: RACE_CALENDAR_NORMALIZER_VERSION,
};
