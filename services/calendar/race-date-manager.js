/* ========================================
   RaceDateManager — Ver7.1
   ======================================== */

import { createRaceDate } from "./models.js";

export function listMeetingDates(meetings = []) {
  return (meetings || [])
    .map((m) =>
      createRaceDate({
        date: m.date,
        isMeetingDay: true,
        venueCount: (m.venues || []).length,
      })
    )
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function isMeetingDate(meetings, date) {
  return (meetings || []).some((m) => m.date === date);
}

export function getMeetingByDate(meetings, date) {
  return (meetings || []).find((m) => m.date === date) || null;
}

export function getDateRange(meetings = []) {
  const dates = listMeetingDates(meetings).map((d) => d.date);
  if (!dates.length) {
    return { min: null, max: null };
  }
  return { min: dates[0], max: dates[dates.length - 1] };
}

export function buildMonthCells(year, month, meetingDateSet, options = {}) {
  // month: 1-12
  const first = new Date(year, month - 1, 1);
  const startPad = first.getDay(); // 0 Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  const accessibleSet =
    options.accessibleDateSet instanceof Set ? options.accessibleDateSet : null;

  for (let i = 0; i < startPad; i += 1) {
    cells.push({ type: "pad", date: null, selectable: false });
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isMeetingDay = meetingDateSet.has(date);
    const withinRetention = accessibleSet ? accessibleSet.has(date) : isMeetingDay;
    const selectable = isMeetingDay && withinRetention;
    cells.push({
      type: "day",
      day: d,
      date,
      selectable,
      isMeetingDay,
      expired: isMeetingDay && !selectable,
    });
  }
  return cells;
}

export const RaceDateManager = {
  listMeetingDates,
  isMeetingDate,
  getMeetingByDate,
  getDateRange,
  buildMonthCells,
};
