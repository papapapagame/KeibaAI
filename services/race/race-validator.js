/* ========================================
   RaceValidator — Ver7.3
   ======================================== */

export function validateRace(race) {
  const errors = [];
  const warnings = [];

  if (!race) {
    return { ok: false, errors: [{ code: "EMPTY", message: "Race が空です" }], warnings };
  }
  if (!race.raceId && !race.number) {
    errors.push({ code: "REQUIRED_ID", message: "raceId/number 必須" });
  }
  if (!race.date) warnings.push({ code: "DATE", message: "開催日欠損" });
  if (!race.venue?.venueId && !race.venueId) {
    warnings.push({ code: "VENUE", message: "開催場欠損" });
  }
  const dist = race.distance?.meters ?? race.distance;
  if (!dist || dist < 800 || dist > 4000) {
    errors.push({ code: "DISTANCE", message: `距離異常: ${dist}` });
  }
  if (!race.surface?.value && !race.track) {
    errors.push({ code: "SURFACE", message: "馬場（芝/ダート）必須" });
  }

  const nums = (race.horses || []).map((h) => h.number);
  const seen = new Set();
  for (const n of nums) {
    if (!n) errors.push({ code: "HORSE_NUM", message: "馬番欠損" });
    else if (seen.has(n)) errors.push({ code: "DUP", message: `馬番重複 ${n}` });
    seen.add(n);
  }

  return { ok: errors.length === 0, errors, warnings };
}

export const RaceValidator = { validate: validateRace };
