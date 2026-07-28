/* ========================================
   RaceSessionManager — Ver7.1
   ======================================== */

import { createRaceSession, createAnalysisStage, clampStage } from "./models.js";
import { getVenueSession } from "./venue-manager.js";

export function buildSession(meetings, date, venueId, raceStages = {}) {
  const venue = getVenueSession(meetings, date, venueId);
  if (!venue) return null;
  return createRaceSession({
    date,
    venue,
    analysisStage: venue.defaultStage,
  });
}

export function resolveRaceStage(options = {}) {
  const {
    date,
    venueId,
    raceNumber,
    raceStages = {},
    sessionDefaultStage = 0,
  } = options;
  const key = `${date}|${venueId}|${raceNumber}`;
  if (raceStages[key] != null) return clampStage(raceStages[key]);
  return clampStage(sessionDefaultStage);
}

export function buildSessionWithRaceStage(meetings, date, venueId, raceNumber, raceStages) {
  const session = buildSession(meetings, date, venueId);
  if (!session) return null;
  const stage = resolveRaceStage({
    date,
    venueId,
    raceNumber,
    raceStages,
    sessionDefaultStage: session.venue.defaultStage,
  });
  return {
    ...session,
    analysisStage: createAnalysisStage(stage),
    raceNumber: Number(raceNumber) || null,
  };
}

export const RaceSessionManager = {
  buildSession,
  resolveRaceStage,
  buildSessionWithRaceStage,
};
