/* ========================================
   Race scope match — Real entry/odds を対象レースに限定
   ======================================== */

/**
 * 要求レースとフィード meta が一致するか。
 * 識別子が片側に無い項目は無視（過拘束しない）。
 * date/venue/raceNumber/raceId のいずれかが両方あり不一致なら false。
 */
export function raceScopeMatches(meta = {}, options = {}) {
  const m = meta || {};
  const date = String(options.date || options.raceDate || "").trim();
  const venue = String(options.venueId || options.venue || "").trim();
  const raceId = String(options.raceId || "").trim();
  const numRaw = options.raceNumber;
  const num =
    numRaw != null && numRaw !== "" ? Number(numRaw) : null;

  if (raceId && m.raceId && String(m.raceId) !== raceId) return false;
  if (date && m.raceDate && String(m.raceDate) !== date) return false;
  if (venue && m.venueId && String(m.venueId) !== venue) return false;
  if (
    Number.isFinite(num) &&
    num > 0 &&
    m.raceNumber != null &&
    Number(m.raceNumber) !== num
  ) {
    return false;
  }
  return true;
}

export function hasRaceScope(options = {}) {
  return Boolean(
    options.date ||
      options.raceDate ||
      options.venueId ||
      options.venue ||
      options.raceId ||
      (options.raceNumber != null && options.raceNumber !== "")
  );
}
