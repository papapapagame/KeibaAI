/* ========================================
   RaceCalendarParser — Ver10.0
   生JSON → 中間構造
   ======================================== */

export const RACE_CALENDAR_PARSER_VERSION = "10.0.0";

/**
 * Provider / API 生データ → パース済み meetings / races
 */
export function parseRaceCalendarRaw(raw = {}, providerId = "real-race") {
  if (!raw || typeof raw !== "object") {
    return {
      providerId,
      meetings: [],
      races: [],
      venues: [],
      raceStages: {},
      parsedAt: new Date().toISOString(),
      version: RACE_CALENDAR_PARSER_VERSION,
      empty: true,
    };
  }

  const venueLookup = buildVenueLookup(raw.venues || []);
  const meetingsRaw = Array.isArray(raw.meetings) ? raw.meetings : [];
  const racesRaw = Array.isArray(raw.races) ? raw.races : [];

  // meetings から venue メタを補完
  for (const m of meetingsRaw) {
    for (const v of m.venues || []) {
      const id = String(v.venueId || v.value || "").toLowerCase();
      if (!id) continue;
      venueLookup[id] = {
        ...(venueLookup[id] || {}),
        venueId: id,
        label: v.label || venueLookup[id]?.label || id,
        kai: Number(v.kai) || venueLookup[id]?.kai || 0,
        day: Number(v.day) || venueLookup[id]?.day || 0,
        totalDays: Number(v.totalDays) || venueLookup[id]?.totalDays || 0,
        isFinalDay: Boolean(v.isFinalDay),
        division: v.division || venueLookup[id]?.division || "",
        status: v.status || venueLookup[id]?.status || "scheduled",
        defaultStage:
          v.defaultStage != null
            ? Number(v.defaultStage)
            : venueLookup[id]?.defaultStage,
      };
    }
  }

  const races = racesRaw.map((r) => parseRaceRow(r, venueLookup, raw.date));
  const meetings =
    meetingsRaw.length > 0
      ? meetingsRaw.map((m) => parseMeetingRow(m))
      : buildMeetingsFromRaces(races, venueLookup);

  return {
    providerId,
    meetings,
    races,
    venues: Object.values(venueLookup),
    raceStages: raw.raceStages && typeof raw.raceStages === "object"
      ? { ...raw.raceStages }
      : {},
    source: raw.source || "real",
    updatedAt: raw.updatedAt || null,
    parsedAt: new Date().toISOString(),
    version: RACE_CALENDAR_PARSER_VERSION,
    empty: false,
  };
}

function parseMeetingRow(m = {}) {
  return {
    date: String(m.date || ""),
    venues: (m.venues || []).map((v) => ({
      venueId: String(v.venueId || v.value || "").toLowerCase(),
      label: v.label || "",
      kai: Number(v.kai) || 0,
      day: Number(v.day) || 0,
      totalDays: Number(v.totalDays) || 0,
      isFinalDay: Boolean(v.isFinalDay),
      division: v.division || "",
      status: v.status || "scheduled",
      defaultStage:
        v.defaultStage != null && Number.isFinite(Number(v.defaultStage))
          ? Number(v.defaultStage)
          : 0,
    })),
  };
}

function parseRaceRow(r = {}, venueLookup = {}, fallbackDate = "") {
  const venueId = String(r.venueId || r.venue || r.value || "").toLowerCase();
  const meta = venueLookup[venueId] || {};
  return {
    date: String(r.date || fallbackDate || ""),
    venueId,
    venueLabel: r.venueLabel || r.label || meta.label || venueId,
    kai: Number(r.kai ?? meta.kai) || 0,
    day: Number(r.day ?? meta.day) || 0,
    totalDays: Number(r.totalDays ?? meta.totalDays) || 0,
    isFinalDay:
      r.isFinalDay != null ? Boolean(r.isFinalDay) : Boolean(meta.isFinalDay),
    number: Number(r.number ?? r.raceNumber) || 0,
    raceName: String(r.raceName || r.name || ""),
    startTime: String(r.startTime || r.time || ""),
    surface: String(r.surface || r.track || ""),
    distance: Number(r.distance ?? r.distanceMeters) || 0,
    courseDirection: String(r.courseDirection || r.direction || ""),
    raceClass: String(r.raceClass || r.class || r.condition || ""),
    grade: String(r.grade || ""),
    ageCondition: String(r.ageCondition || r.age || ""),
    fieldSize: Number(r.fieldSize ?? r.maxRunners ?? r.capacity) || 0,
    division: r.division || meta.division || "",
    status: r.status || meta.status || "scheduled",
    defaultStage:
      r.defaultStage != null
        ? Number(r.defaultStage)
        : meta.defaultStage != null
          ? Number(meta.defaultStage)
          : 0,
    raceId: r.raceId || null,
    sourceUrl: r.sourceUrl || null,
    weather: r.weather || "",
    trackCondition: r.trackCondition || "",
    turfCondition: r.turfCondition || "",
    dirtCondition: r.dirtCondition || "",
    courseLoop: r.courseLoop || r.course || "",
    prize: Number(r.prize ?? r.prizeMoney) || 0,
  };
}

function buildMeetingsFromRaces(races, venueLookup) {
  const byDate = new Map();
  for (const r of races) {
    if (!r.date || !r.venueId) continue;
    if (!byDate.has(r.date)) byDate.set(r.date, new Map());
    const venues = byDate.get(r.date);
    if (!venues.has(r.venueId)) {
      const meta = venueLookup[r.venueId] || {};
      venues.set(r.venueId, {
        venueId: r.venueId,
        label: r.venueLabel || meta.label || r.venueId,
        kai: r.kai || meta.kai || 0,
        day: r.day || meta.day || 0,
        totalDays: r.totalDays || meta.totalDays || 0,
        isFinalDay: r.isFinalDay || Boolean(meta.isFinalDay),
        division: r.division || meta.division || "",
        status: r.status || meta.status || "scheduled",
        defaultStage: r.defaultStage ?? meta.defaultStage ?? 0,
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

function buildVenueLookup(venues = []) {
  const map = {};
  for (const v of venues) {
    const id = String(v.venueId || v.value || v.id || "").toLowerCase();
    if (!id) continue;
    map[id] = {
      venueId: id,
      label: v.label || id,
      kai: Number(v.kai) || 0,
      day: Number(v.day) || 0,
      totalDays: Number(v.totalDays) || 0,
      isFinalDay: Boolean(v.isFinalDay),
      division: v.division || "",
      status: v.status || "scheduled",
      defaultStage:
        v.defaultStage != null ? Number(v.defaultStage) : undefined,
    };
  }
  return map;
}

export const RaceCalendarParser = {
  parse: parseRaceCalendarRaw,
  version: RACE_CALENDAR_PARSER_VERSION,
};
