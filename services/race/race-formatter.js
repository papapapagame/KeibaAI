/* ========================================
   RaceFormatter — Ver7.3
   ======================================== */

export function formatRaceSummary(race) {
  if (!race) return "—";
  const venue = race.venue?.label || race.venueLabel || "";
  const num = race.number ? `${race.number}R` : "";
  const name = race.raceName || race.name || "";
  const dist = race.surfaceDistance || `${race.track || ""}${race.distance || ""}`;
  return [race.date, venue, num, name, dist].filter(Boolean).join(" · ");
}

export function formatRaceMeta(race) {
  if (!race) return {};
  return {
    date: race.date || "—",
    venue: race.venue?.label || race.venueLabel || "—",
    kai: race.kai ? `${race.kai}回` : "—",
    day: race.day ? `${race.day}日目` : "—",
    number: race.number ? `${race.number}R` : "—",
    distance: race.surfaceDistance || "—",
    condition: race.trackCondition || "—",
    weather: race.weather || "—",
    time: race.startTime || race.time || "—",
  };
}

export const RaceFormatter = {
  summary: formatRaceSummary,
  meta: formatRaceMeta,
};
