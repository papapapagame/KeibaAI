/* ========================================
   Race scope match — Real entry/odds を対象レースに限定
   ======================================== */

/**
 * 要求レースとフィード meta が一致するか。
 * meta に raceNumber がある場合は options.raceNumber 必須一致
 * （1ファイルの出馬表を全レースへ流用しない）
 */
export function raceScopeMatches(meta = {}, options = {}) {
  const m = meta || {};
  const date = String(options.date || options.raceDate || "").trim();
  const venue = String(options.venueId || options.venue || "").trim();
  const raceId = String(options.raceId || "").trim();
  const numRaw = options.raceNumber ?? options.number;
  const num =
    numRaw != null && numRaw !== "" ? Number(numRaw) : NaN;

  const metaNum =
    m.raceNumber != null && m.raceNumber !== ""
      ? Number(m.raceNumber)
      : NaN;

  // 出馬表にレース番号がある → 必ず同じ R のみ許可
  if (Number.isFinite(metaNum) && metaNum > 0) {
    if (!Number.isFinite(num) || num <= 0 || num !== metaNum) return false;
  }

  if (date && m.raceDate && String(m.raceDate) !== date) return false;
  if (venue && m.venueId && String(m.venueId) !== venue) return false;

  // 両方に raceId がある場合は一致必須
  if (raceId && m.raceId && String(m.raceId) !== raceId) return false;

  return true;
}

export function hasRaceScope(options = {}) {
  return Boolean(
    options.date ||
      options.raceDate ||
      options.venueId ||
      options.venue ||
      options.raceId ||
      (options.raceNumber != null && options.raceNumber !== "") ||
      (options.number != null && options.number !== "")
  );
}
