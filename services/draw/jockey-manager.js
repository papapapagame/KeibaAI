/* ========================================
   Jockey Manager — Ver7.7
   ======================================== */

export function extractJockeyRecords(draws = []) {
  return (draws || []).map((d) => ({
    number: d.number,
    horse: d.horse,
    jockey: d.jockeyConfirmed ? d.jockey : null,
    previousJockey: d.previousJockey || null,
    riderChanged: Boolean(d.riderChanged),
    confirmed: Boolean(d.jockeyConfirmed),
    history: d.jockeyHistory || [],
    scratched: Boolean(d.scratched),
    excluded: Boolean(d.excluded),
  }));
}

export function jockeyStatusSummary(draws = []) {
  const records = extractJockeyRecords(draws);
  const active = records.filter((r) => !r.scratched && !r.excluded);
  return {
    total: active.length,
    confirmed: active.filter((r) => r.confirmed).length,
    riderChanged: active.filter((r) => r.riderChanged).length,
    pending: active.filter((r) => !r.confirmed).length,
  };
}

/** 確定騎手のみ返す（未確定は推測しない） */
export function resolveConfirmedJockey(draw, stage = 0) {
  const s = Number(stage) || 0;
  if (s < 4) return { jockey: null, confirmed: false };
  if (!draw?.jockeyConfirmed || !draw.jockey || draw.jockey === "未定") {
    return { jockey: null, confirmed: false };
  }
  return {
    jockey: draw.jockey,
    previousJockey: draw.previousJockey || null,
    riderChanged: Boolean(draw.riderChanged),
    confirmed: true,
  };
}

export const JockeyManager = {
  extract: extractJockeyRecords,
  summary: jockeyStatusSummary,
  resolve: resolveConfirmedJockey,
};
