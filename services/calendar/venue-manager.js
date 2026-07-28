/* ========================================
   VenueManager — Ver7.1
   ======================================== */

import { createRaceVenue } from "./models.js";
import { getMeetingByDate } from "./race-date-manager.js";

export function listVenuesForDate(meetings, date) {
  const meeting = getMeetingByDate(meetings, date);
  if (!meeting) return [];
  return (meeting.venues || []).map((v) => createRaceVenue(v));
}

export function getVenueSession(meetings, date, venueId) {
  const venues = listVenuesForDate(meetings, date);
  return venues.find((v) => v.venueId === venueId) || null;
}

export const VenueManager = {
  listVenuesForDate,
  getVenueSession,
};
