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

/**
 * 単一レース or races[] カタログから対象カードを選ぶ。
 * カタログで不一致なら null。
 */
export function selectRaceCard(raw = {}, options = {}) {
  if (!raw || typeof raw !== "object") return null;
  const races = Array.isArray(raw.races) ? raw.races : null;
  if (races && races.length) {
    if (!hasRaceScope(options)) return races[0] || null;
    return (
      races.find((r) =>
        raceScopeMatches(
          {
            raceDate: r.raceDate || r.date || null,
            venueId: r.venueId || r.venue || null,
            raceNumber: r.raceNumber ?? r.number ?? null,
            raceId: r.raceId || r.id || null,
          },
          options
        )
      ) || null
    );
  }

  if (!hasRaceScope(options)) return raw;
  const meta = {
    raceDate: raw.raceDate || raw.date || null,
    venueId: raw.venueId || raw.venue || null,
    raceNumber: raw.raceNumber ?? raw.number ?? null,
    raceId: raw.raceId || raw.id || null,
  };
  return raceScopeMatches(meta, options) ? raw : null;
}
