/* ========================================
   RaceMapper — Ver7.3
   Provider差異 → Unified Race
   ======================================== */

import { createRace } from "../models/unified.js";

/**
 * Provider raw を共通 Race へ
 * @param {"mock"|"jra"|"netkeiba"|"jbis"|"real"} providerId
 */
export function mapRaceFromProvider(providerId, rawRace = {}, horses = []) {
  const normalized = normalizeByProvider(providerId, rawRace);
  return createRace(normalized, horses);
}

function normalizeByProvider(providerId, raw) {
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
      };
    case "netkeiba":
      return {
        ...raw,
        venueId: raw.place || raw.venueId || raw.venue,
        venueLabel: raw.place_name || raw.venueLabel,
        number: raw.race_num || raw.number,
        raceName: raw.title || raw.raceName || raw.name,
        distance: raw.distance,
        surface: raw.ground || raw.surface || raw.track,
        trackCondition: raw.condition || raw.trackCondition,
        startTime: raw.post_time || raw.startTime || raw.time,
        date: raw.date,
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
      };
    case "real":
    case "mock":
    default:
      return {
        ...raw,
        venueId: raw.venueId || raw.venue || raw.value,
        venueLabel: raw.venueLabel || raw.label,
        number: raw.number || raw.raceNumber,
        raceName: raw.raceName || raw.name,
        distance: raw.distance,
        surface: raw.surface || raw.track,
        trackCondition: raw.trackCondition,
        startTime: raw.startTime || raw.time,
        date: raw.date,
        kai: raw.kai,
        day: raw.day,
      };
  }
}

export const RaceMapper = { map: mapRaceFromProvider };
