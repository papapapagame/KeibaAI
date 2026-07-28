/* ========================================
   CalendarValidator — Ver7.1
   ======================================== */

import {
  isWithinRetentionWindow,
  retentionBlockedMessage,
} from "./retention-window.js";

export function validateCalendarPayload(payload) {
  const errors = [];
  const warnings = [];

  if (!payload || typeof payload !== "object") {
    return { ok: false, errors: [{ code: "EMPTY", message: "カレンダーが空です" }], warnings };
  }

  const meetings = payload.meetings;
  if (!Array.isArray(meetings) || !meetings.length) {
    errors.push({ code: "NO_MEETINGS", message: "開催日がありません" });
  }

  const dates = new Set();
  for (const m of meetings || []) {
    if (!m.date || !/^\d{4}-\d{2}-\d{2}$/.test(m.date)) {
      errors.push({ code: "BAD_DATE", message: `日付不正: ${m.date}` });
      continue;
    }
    if (dates.has(m.date)) {
      errors.push({ code: "DUP_DATE", message: `日付重複: ${m.date}` });
    }
    dates.add(m.date);

    if (!Array.isArray(m.venues) || !m.venues.length) {
      warnings.push({ code: "NO_VENUE", message: `${m.date} に開催場がありません` });
      continue;
    }

    const venueIds = new Set();
    for (const v of m.venues) {
      if (!v.venueId && !v.value) {
        errors.push({ code: "VENUE_ID", message: `${m.date}: venueId 欠損` });
      }
      const id = v.venueId || v.value;
      if (venueIds.has(id)) {
        errors.push({ code: "DUP_VENUE", message: `${m.date}: 開催場重複 ${id}` });
      }
      venueIds.add(id);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateDateSelection(meetings, date) {
  if (!date) return { ok: false, message: "開催日を選択してください" };
  const hit = (meetings || []).some((m) => m.date === date);
  if (!hit) return { ok: false, message: "非開催日は選択できません" };
  if (!isWithinRetentionWindow(date)) {
    return { ok: false, message: retentionBlockedMessage() };
  }
  return { ok: true, message: "" };
}

export function validateVenueSelection(meetings, date, venueId) {
  const dateOk = validateDateSelection(meetings, date);
  if (!dateOk.ok) return dateOk;
  const meeting = (meetings || []).find((m) => m.date === date);
  const hit = (meeting?.venues || []).some(
    (v) => (v.venueId || v.value) === venueId
  );
  if (!hit) return { ok: false, message: "その日に開催されない競馬場です" };
  return { ok: true, message: "" };
}

export const CalendarValidator = {
  validateCalendarPayload,
  validateDateSelection,
  validateVenueSelection,
};
