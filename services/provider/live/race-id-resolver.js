/* ========================================
   Race ID 解決（Calendar 同期状態から）
   ======================================== */

import { getRealRaceState } from "../race/race-calendar-synchronizer.js";
import { parseNetkeibaRaceId } from "./netkeiba-utils.js";

/**
 * options / 同期済みカレンダーから netkeiba race_id を解決
 */
export function resolveLiveRaceId(options = {}) {
  if (options.raceId) {
    const parsed = parseNetkeibaRaceId(options.raceId);
    if (parsed) return parsed.raceId;
    return String(options.raceId);
  }

  const date = options.date || options.raceDate || "";
  const venueId = String(options.venueId || options.venue || "").toLowerCase();
  const number = Number(options.raceNumber || options.number) || 0;

  const state = getRealRaceState();
  const races = [
    ...(state?.legacyRaces || []),
    ...(state?.races || []),
    ...(state?.calendar?.races || []),
  ];

  const hit =
    races.find((r) => {
      const rVenue = String(r.venueId || r.venue || r.venue?.venueId || "").toLowerCase();
      const rNum = Number(r.number || r.raceNumber) || 0;
      const rDate = r.date || "";
      const id = r.raceId || "";
      if (id && /^\d{12}$/.test(String(id)) && number && rNum === number) {
        if (date && rDate && rDate !== date) return false;
        if (venueId && rVenue && rVenue !== venueId) return false;
        return true;
      }
      return (
        (!date || rDate === date) &&
        (!venueId || rVenue === venueId) &&
        (!number || rNum === number) &&
        Boolean(r.raceId)
      );
    }) ||
    races.find((r) => {
      const rVenue = String(r.venueId || r.venue || "").toLowerCase();
      const rNum = Number(r.number) || 0;
      const rDate = r.date || "";
      return (
        (!date || !rDate || rDate === date) &&
        (!venueId || !rVenue || rVenue === venueId) &&
        (!number || rNum === number) &&
        Boolean(r.raceId)
      );
    });

  if (hit?.raceId) return String(hit.raceId);

  // unified raceId が synthetic の場合は不可
  return null;
}

export function resolveLiveRaceContext(options = {}) {
  const raceId = resolveLiveRaceId(options);
  const parsed = raceId ? parseNetkeibaRaceId(raceId) : null;
  return {
    raceId,
    raceDate: options.date || options.raceDate || null,
    venueId: options.venueId || options.venue || parsed?.venueId || null,
    raceNumber:
      Number(options.raceNumber || options.number || parsed?.number) || null,
    meta: parsed,
  };
}
