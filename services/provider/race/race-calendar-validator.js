/* ========================================
   RaceCalendarValidator — Ver10.0
   開催日・開催場・レース重複・時刻・距離・必須項目
   ======================================== */

export const RACE_CALENDAR_VALIDATOR_VERSION = "10.0.0";

const REQUIRED_RACE = [
  "date",
  "venueId",
  "number",
  "raceName",
  "startTime",
  "surface",
  "distance",
];

/**
 * 正規化前パース結果を検証。失敗データは採用しない。
 */
export function validateRaceCalendar(parsed = {}) {
  const errors = [];
  const warnings = [];
  const meetings = parsed.meetings || [];
  const races = parsed.races || [];

  if (!meetings.length && !races.length) {
    errors.push({
      code: "EMPTY",
      message: "開催データが空です",
    });
  }

  const dateSet = new Set();
  for (const m of meetings) {
    if (!m.date || !/^\d{4}-\d{2}-\d{2}$/.test(m.date)) {
      errors.push({ code: "BAD_DATE", message: `開催日不正: ${m.date}` });
      continue;
    }
    if (dateSet.has(m.date)) {
      errors.push({ code: "DUP_DATE", message: `開催日重複: ${m.date}` });
    }
    dateSet.add(m.date);

    const venueIds = new Set();
    for (const v of m.venues || []) {
      if (!v.venueId) {
        errors.push({
          code: "VENUE_ID",
          message: `${m.date}: 開催場ID欠損`,
        });
        continue;
      }
      if (venueIds.has(v.venueId)) {
        errors.push({
          code: "DUP_VENUE",
          message: `${m.date}: 開催場重複 ${v.venueId}`,
        });
      }
      venueIds.add(v.venueId);
      if (!v.label) {
        warnings.push({
          code: "VENUE_LABEL",
          message: `${m.date}/${v.venueId}: 開催場名欠損`,
        });
      }
    }
  }

  const raceKeys = new Set();
  const acceptedRaces = [];
  for (const r of races) {
    const rowErrors = [];
    for (const key of REQUIRED_RACE) {
      const val = r[key];
      if (val == null || val === "" || (key === "number" && !Number(val))) {
        rowErrors.push({
          code: "REQUIRED",
          message: `必須欠損: ${key} (${r.date || "?"}/${r.venueId || "?"}/${r.number || "?"})`,
        });
      }
    }

    if (r.date && !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) {
      rowErrors.push({
        code: "BAD_DATE",
        message: `レース開催日不正: ${r.date}`,
      });
    }

    if (r.startTime && !/^\d{1,2}:\d{2}$/.test(String(r.startTime))) {
      rowErrors.push({
        code: "BAD_TIME",
        message: `発走時刻不正: ${r.startTime}`,
      });
    }

    const dist = Number(r.distance);
    if (Number.isFinite(dist) && dist > 0 && (dist < 800 || dist > 4300)) {
      rowErrors.push({
        code: "BAD_DISTANCE",
        message: `距離異常: ${r.distance}`,
      });
    }

    const dupKey = `${r.date}|${r.venueId}|${r.number}`;
    if (raceKeys.has(dupKey)) {
      rowErrors.push({ code: "DUP_RACE", message: `レース重複: ${dupKey}` });
    }
    raceKeys.add(dupKey);

    if (rowErrors.length) {
      errors.push(...rowErrors);
      continue;
    }
    acceptedRaces.push(r);
  }

  // 開催日があるがレースが一切無い場合は警告
  if (meetings.length && !acceptedRaces.length) {
    warnings.push({
      code: "NO_RACES",
      message: "開催日はあるが有効なレースがありません",
    });
  }

  // 致命的エラーが無ければ ok（失敗レースは除外して採用）
  const fatalCodes = new Set([
    "EMPTY",
    "BAD_DATE",
    "DUP_DATE",
    "VENUE_ID",
    "DUP_VENUE",
  ]);
  const fatal = errors.filter((e) => fatalCodes.has(e.code));
  const soft = errors.filter((e) => !fatalCodes.has(e.code));

  return {
    ok: fatal.length === 0 && (meetings.length > 0 || acceptedRaces.length > 0),
    errors: [...fatal, ...soft],
    warnings,
    acceptedMeetings: fatal.length === 0 ? meetings : [],
    acceptedRaces,
    rejectedRaceCount: races.length - acceptedRaces.length,
    version: RACE_CALENDAR_VALIDATOR_VERSION,
  };
}

export const RaceCalendarValidator = {
  validate: validateRaceCalendar,
  version: RACE_CALENDAR_VALIDATOR_VERSION,
};
