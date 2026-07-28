/* ========================================
   HorseEntryParser — Ver10.1
   ======================================== */

import { normalizeEntryStatus } from "../../entry/entry-status.js";

export const HORSE_ENTRY_PARSER_VERSION = "10.1.0";

export function parseHorseEntryRaw(raw = {}, providerId = "real-horse") {
  if (!raw || typeof raw !== "object") {
    return {
      providerId,
      entries: [],
      meta: {},
      parsedAt: new Date().toISOString(),
      version: HORSE_ENTRY_PARSER_VERSION,
      empty: true,
    };
  }

  const list = Array.isArray(raw.entries)
    ? raw.entries
    : Array.isArray(raw.horses)
      ? raw.horses
      : [];

  const entries = list.map((h, idx) => parseEntryRow(h, idx));

  return {
    providerId,
    entries,
    meta: {
      raceDate: raw.raceDate || raw.date || null,
      venueId: raw.venueId || raw.venue || null,
      raceNumber: raw.raceNumber != null ? Number(raw.raceNumber) : null,
      defaultStage:
        raw.defaultStage != null ? Number(raw.defaultStage) : null,
      updatedAt: raw.updatedAt || null,
      source: raw.source || "real",
    },
    parsedAt: new Date().toISOString(),
    version: HORSE_ENTRY_PARSER_VERSION,
    empty: false,
  };
}

function parseEntryRow(h = {}, idx = 0) {
  const number = Number(h.number ?? h.umaban ?? idx + 1) || 0;
  const horseName = String(h.horseName || h.horse || h.name || "");
  const jockeyName =
    typeof h.jockey === "object" ? h.jockey?.name : h.jockey;
  const trainerName =
    typeof h.trainer === "object" ? h.trainer?.name : h.trainer;

  return {
    horseId: h.horseId || h.id || `H${String(number).padStart(4, "0")}`,
    horseName,
    horse: horseName,
    number,
    frame: h.frame != null ? Number(h.frame) : null,
    sex: h.sex || "",
    age: h.age != null ? Number(h.age) : null,
    weight:
      h.weight != null
        ? Number(h.weight)
        : h.carriedWeight != null
          ? Number(h.carriedWeight)
          : null,
    carriedWeight:
      h.carriedWeight != null
        ? Number(h.carriedWeight)
        : h.weight != null
          ? Number(h.weight)
          : null,
    jockey: jockeyName || "",
    jockeyId:
      h.jockeyId ||
      (typeof h.jockey === "object" ? h.jockey?.jockeyId : null) ||
      null,
    trainer: trainerName || "",
    trainerId:
      h.trainerId ||
      (typeof h.trainer === "object" ? h.trainer?.trainerId : null) ||
      null,
    affiliation: h.affiliation || "",
    entryStatus: normalizeEntryStatus(h.entryStatus || h.status),
    runningStyle: h.runningStyle || "",
    lastRace: h.lastRace || "",
    last3: Array.isArray(h.last3) ? h.last3 : [],
    winRate: Number(h.winRate) || 0,
    placeRate: Number(h.placeRate) || 0,
    grade: h.grade || "",
    stars: Number(h.stars) || 0,
    trackType: h.trackType || "",
    distanceType: h.distanceType || "",
    popularity: h.popularity != null ? Number(h.popularity) : null,
    odds: h.odds != null ? Number(h.odds) : null,
    careerRecord: h.careerRecord || null,
    distanceRecord: h.distanceRecord || h.distanceType || null,
    courseRecord: h.courseRecord || null,
    trackRecord: h.trackRecord || h.trackType || null,
    stakesRecord: h.stakesRecord || h.grade || null,
    earnings: h.earnings != null ? Number(h.earnings) : null,
  };
}

export const HorseEntryParser = {
  parse: parseHorseEntryRaw,
  version: HORSE_ENTRY_PARSER_VERSION,
};
