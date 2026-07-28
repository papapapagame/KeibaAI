/* ========================================
   Weight Manager — Ver7.7
   ======================================== */

export function extractWeightRecords(draws = []) {
  return (draws || []).map((d) => ({
    number: d.number,
    horse: d.horse,
    weight: d.weightConfirmed ? d.weight : null,
    confirmed: Boolean(d.weightConfirmed),
    history: d.weightHistory || [],
    scratched: Boolean(d.scratched),
    excluded: Boolean(d.excluded),
  }));
}

export function weightStatusSummary(draws = []) {
  const records = extractWeightRecords(draws);
  const active = records.filter((r) => !r.scratched && !r.excluded);
  return {
    total: active.length,
    confirmed: active.filter((r) => r.confirmed).length,
    pending: active.filter((r) => !r.confirmed).length,
    changed: active.filter((r) => (r.history || []).length > 0).length,
  };
}

/** 確定斤量のみ返す（未確定は推測しない） */
export function resolveConfirmedWeight(draw, stage = 0) {
  const s = Number(stage) || 0;
  if (s < 5) return { weight: null, confirmed: false };
  if (!draw?.weightConfirmed || !Number.isFinite(Number(draw.weight))) {
    return { weight: null, confirmed: false };
  }
  return {
    weight: Number(draw.weight),
    confirmed: true,
  };
}

export const WeightManager = {
  extract: extractWeightRecords,
  summary: weightStatusSummary,
  resolve: resolveConfirmedWeight,
};
