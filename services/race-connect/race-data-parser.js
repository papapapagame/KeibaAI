/* ========================================
   Race Data Parser + Validator — Ver7.5
   ======================================== */

import { createRace } from "../models/unified.js";

const REQUIRED = ["date", "venueId", "number"];

/**
 * Provider raw → 正規化 Race レコード配列
 */
export function parseRaceConnectRaw(raw = {}, providerId = "mock") {
  const racesRaw = Array.isArray(raw.races) && raw.races.length
    ? raw.races
    : raw.race
      ? [raw.race]
      : [];

  const venueLookup = buildVenueLookup(raw.venues || []);
  const meetingLookup = buildMeetingLookup(raw.calendarHint?.meetings || []);

  const races = racesRaw.map((r) =>
    normalizeRaceRecord(r, providerId, venueLookup, meetingLookup, raw.date)
  );

  const meetings = buildMeetingsFromRaces(races, meetingLookup);

  return {
    providerId,
    races,
    meetings,
    venues: Object.values(venueLookup),
    parsedAt: new Date().toISOString(),
  };
}

/**
 * Validation: 必須・型・重複・異常値・欠損
 * 失敗時は AI へ渡さない（ok=false）
 */
export function validateRaceConnectData(parsed = {}) {
  const errors = [];
  const warnings = [];
  const races = parsed.races || [];
  const seen = new Set();

  if (!races.length) {
    errors.push({ code: "EMPTY", message: "Race データが空です" });
  }

  for (const race of races) {
    for (const key of REQUIRED) {
      if (race[key] == null || race[key] === "") {
        errors.push({
          code: "REQUIRED",
          message: `必須欠損: ${key} (race ${race.number || "?"})`,
        });
      }
    }

    if (race.number != null && !Number.isFinite(Number(race.number))) {
      errors.push({
        code: "TYPE",
        message: `レース番号の型異常: ${race.number}`,
      });
    }

    if (race.distanceMeters != null) {
      const d = Number(race.distanceMeters);
      if (!Number.isFinite(d) || d < 800 || d > 4000) {
        errors.push({
          code: "RANGE",
          message: `距離の異常値: ${race.distanceMeters}`,
        });
      }
    }

    const dupKey = `${race.date}|${race.venueId}|${race.number}`;
    if (seen.has(dupKey)) {
      errors.push({ code: "DUP", message: `重複レース: ${dupKey}` });
    }
    seen.add(dupKey);

    if (!race.raceName) {
      warnings.push({ code: "MISSING", message: `レース名欠損: ${dupKey}` });
    }
    if (!race.startTime) {
      warnings.push({ code: "MISSING", message: `発走時刻欠損: ${dupKey}` });
    }
  }

  const sanitized = races.filter((r) => {
    return REQUIRED.every((k) => r[k] != null && r[k] !== "");
  });

  return {
    ok: errors.length === 0 && sanitized.length > 0,
    errors,
    warnings,
    sanitized,
  };
}

/** Unified Race モデルへ（Horse なし） */
export function toUnifiedRaces(records = []) {
  return (records || []).map((r) =>
    createRace(
      {
        date: r.date,
        venue: r.venueId,
        venueId: r.venueId,
        venueLabel: r.venueLabel,
        kai: r.kai,
        day: r.day,
        number: r.number,
        raceName: r.raceName,
        name: r.raceName,
        distance: r.distanceMeters,
        surface: r.surface,
        track: r.surface,
        weather: r.weather,
        trackCondition: r.trackCondition,
        startTime: r.startTime,
        time: r.startTime,
        courseDirection: r.courseDirection,
        courseLoop: r.courseLoop,
        grade: r.grade,
        raceClass: r.raceClass,
        prize: r.prize,
        fieldSize: r.fieldSize,
      },
      []
    )
  );
}

function normalizeRaceRecord(raw, providerId, venueLookup, meetingLookup, fallbackDate) {
  const base = mapProviderFields(providerId, raw);
  const venueId = String(
    base.venueId || base.venue || base.value || ""
  ).toLowerCase();
  const venueMeta = venueLookup[venueId] || {};
  const date = base.date || fallbackDate || "";
  const meetingVenue = meetingLookup.get(`${date}|${venueId}`) || {};

  const distanceMeters = Number(base.distanceMeters ?? base.distance) || 0;
  const surface = String(base.surface || base.track || "").trim();

  return {
    date,
    venueId,
    venueLabel:
      base.venueLabel || venueMeta.label || meetingVenue.label || venueId,
    kai: Number(base.kai ?? meetingVenue.kai) || 0,
    day: Number(base.day ?? meetingVenue.day) || 0,
    totalDays: Number(base.totalDays ?? meetingVenue.totalDays) || 0,
    number: Number(base.number ?? base.raceNumber) || 0,
    raceName: base.raceName || base.name || "",
    startTime: base.startTime || base.time || "",
    distanceMeters,
    surface,
    courseDirection: base.courseDirection || base.direction || "",
    courseLoop: base.courseLoop || base.course || "", // 内・外
    weather: base.weather || "",
    trackCondition: base.trackCondition || base.baba || "",
    grade: base.grade || "",
    raceClass: base.raceClass || base.class || base.conditionClass || "",
    prize: Number(base.prize ?? base.prizeMoney) || 0,
    fieldSize: Number(base.fieldSize) || 0,
  };
}

function mapProviderFields(providerId, raw = {}) {
  switch (providerId) {
    case "jra":
      return {
        ...raw,
        venueId: raw.babaCd || raw.venueId || raw.venue,
        venueLabel: raw.babaName || raw.venueLabel,
        number: raw.raceNum || raw.number,
        raceName: raw.raceName || raw.name,
        distance: raw.kyori || raw.distance,
        surface: raw.trackType || raw.surface || raw.track,
        trackCondition: raw.babajotai || raw.trackCondition,
        startTime: raw.hassouTime || raw.startTime || raw.time,
        date: raw.kaisaiDate || raw.date,
        kai: raw.kaisaiKai || raw.kai,
        day: raw.kaisaiDay || raw.day,
        courseDirection: raw.course || raw.courseDirection,
        courseLoop: raw.uchiSoto || raw.courseLoop,
        raceClass: raw.jyoken || raw.raceClass,
        prize: raw.honsyo || raw.prize,
      };
    case "netkeiba":
      return {
        ...raw,
        venueId: raw.place || raw.venueId || raw.venue,
        venueLabel: raw.place_name || raw.venueLabel,
        number: raw.race_num || raw.number,
        raceName: raw.title || raw.raceName || raw.name,
        surface: raw.ground || raw.surface || raw.track,
        trackCondition: raw.condition || raw.trackCondition,
        startTime: raw.post_time || raw.startTime || raw.time,
        courseLoop: raw.course_side || raw.courseLoop,
        raceClass: raw.class_name || raw.raceClass,
        prize: raw.prize || raw.prize_money,
      };
    case "jbis":
      return {
        ...raw,
        venueId: raw.courseCode || raw.venueId || raw.venue,
        venueLabel: raw.courseName || raw.venueLabel,
        number: raw.raceNumber || raw.number,
        raceName: raw.raceTitle || raw.raceName || raw.name,
        distance: raw.dist || raw.distance,
        surface: raw.surfaceType || raw.surface || raw.track,
        trackCondition: raw.going || raw.trackCondition,
        startTime: raw.postTime || raw.startTime || raw.time,
        date: raw.raceDate || raw.date,
        courseLoop: raw.trackSide || raw.courseLoop,
        raceClass: raw.className || raw.raceClass,
        prize: raw.purse || raw.prize,
      };
    default:
      return { ...raw };
  }
}

function buildVenueLookup(venues = []) {
  const map = {};
  for (const v of venues) {
    const id = String(v.venueId || v.value || v.venue || v.id || "").toLowerCase();
    if (!id) continue;
    map[id] = {
      venueId: id,
      label: v.label || v.venueLabel || id,
    };
  }
  return map;
}

function buildMeetingLookup(meetings = []) {
  const map = new Map();
  for (const m of meetings) {
    const date = m.date;
    for (const v of m.venues || []) {
      const id = String(v.venueId || "").toLowerCase();
      if (!date || !id) continue;
      map.set(`${date}|${id}`, v);
    }
  }
  return map;
}

function buildMeetingsFromRaces(races, meetingLookup) {
  const byDate = new Map();
  for (const r of races) {
    if (!r.date || !r.venueId) continue;
    if (!byDate.has(r.date)) byDate.set(r.date, new Map());
    const venues = byDate.get(r.date);
    if (!venues.has(r.venueId)) {
      const hint = meetingLookup.get(`${r.date}|${r.venueId}`) || {};
      venues.set(r.venueId, {
        venueId: r.venueId,
        label: r.venueLabel || hint.label || r.venueId,
        kai: r.kai || hint.kai || 0,
        day: r.day || hint.day || 0,
        totalDays: r.totalDays || hint.totalDays || 0,
        isFinalDay: hint.isFinalDay ?? false,
        division: hint.division || "",
        status: hint.status || "scheduled",
        defaultStage: hint.defaultStage ?? 3,
      });
    }
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, venues]) => ({
      date,
      venues: [...venues.values()],
    }));
}

/** 変更検知用フィンガープリント（Race のみ） */
export function fingerprintRaceConnect(records = []) {
  const lines = (records || [])
    .map(
      (r) =>
        [
          r.date,
          r.venueId,
          r.number,
          r.raceName,
          r.startTime,
          r.distanceMeters,
          r.surface,
          r.courseDirection,
          r.courseLoop,
          r.weather,
          r.trackCondition,
          r.grade,
          r.raceClass,
          r.prize,
          r.kai,
          r.day,
        ].join("|")
    )
    .sort();
  return lines.join("\n");
}

export const RaceDataParser = {
  parse: parseRaceConnectRaw,
  validate: validateRaceConnectData,
  toUnified: toUnifiedRaces,
  fingerprint: fingerprintRaceConnect,
};
