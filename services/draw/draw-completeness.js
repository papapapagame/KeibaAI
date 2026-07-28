/* ========================================
   Draw Completeness — Ver7.7
   ======================================== */

/**
 * 枠順・騎手・斤量・取消の充足率
 * オッズ・ニュースは本バージョン 0%
 */
export function computeDrawCompleteness(draws = []) {
  const list = draws || [];
  const active = list.filter((d) => !d.scratched && !d.excluded);
  const n = active.length || 1;
  const rate = (pred) =>
    active.length ? Math.round((active.filter(pred).length / n) * 100) : 0;

  const frame = rate((d) => d.frameConfirmed && d.frame > 0);
  const jockey = rate((d) => d.jockeyConfirmed);
  const weight = rate((d) => d.weightConfirmed);
  const scratchInfo =
    list.length === 0
      ? 0
      : Math.round(
          (list.filter(
            (d) =>
              typeof d.scratched === "boolean" && typeof d.excluded === "boolean"
          ).length /
            list.length) *
            100
        );

  const odds = 0;
  const news = 0;

  const scored = [frame, jockey, weight, scratchInfo, odds, news];
  const overall = Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);

  return {
    frame,
    jockey,
    weight,
    scratchInfo,
    odds,
    news,
    overall,
    note:
      overall < 100
        ? "オッズ・ニュースは未取得（確定情報のみ反映）"
        : "Draw 情報充足",
  };
}

export function confidenceFromDrawCompleteness(baseConfidence, completeness) {
  const base = Number(baseConfidence);
  const overall = Number(completeness?.overall);
  if (!Number.isFinite(base) || !Number.isFinite(overall)) return base || null;
  return Math.max(5, Math.min(99, Math.round(base * 0.5 + overall * 0.5)));
}

export const DrawCompleteness = {
  compute: computeDrawCompleteness,
  blendConfidence: confidenceFromDrawCompleteness,
};
