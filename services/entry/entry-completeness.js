/* ========================================
   Horse Entry Completeness — Ver7.6
   ======================================== */

/**
 * Entry 情報の充足率
 * 枠順・騎手・斤量・オッズは本バージョンでは 0%（未取得）
 */
export function computeEntryCompleteness(entries = []) {
  const list = entries || [];
  const n = list.length || 1;

  const rate = (pred) =>
    Math.round((list.filter(pred).length / n) * 100);

  const registered = list.length ? 100 : 0;
  const career = rate((e) =>
    Boolean(e.careerRecord || (e.winRate != null && e.placeRate != null))
  );
  const trainer = rate((e) => Boolean(e.trainer));
  const distance = rate((e) => Boolean(e.distanceRecord || e.distanceType));
  const course = rate((e) => Boolean(e.courseRecord));
  const track = rate((e) => Boolean(e.trackRecord || e.trackType));
  const style = rate((e) => Boolean(e.runningStyle));
  const recent = rate((e) => (e.last3 && e.last3.length) || e.lastRace);
  const stakes = rate((e) => Boolean(e.stakesRecord || e.grade));
  const earnings = rate((e) => e.earnings != null && Number(e.earnings) >= 0);

  const frame = 0;
  const jockey = 0;
  const weight = 0;
  const odds = 0;

  const scored = [
    registered,
    career,
    trainer,
    distance,
    course,
    track,
    style,
    recent,
    stakes,
    earnings,
    frame,
    jockey,
    weight,
    odds,
  ];
  const overall = Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);

  return {
    registered,
    career,
    trainer,
    distance,
    course,
    track,
    style,
    recent,
    stakes,
    earnings,
    frame,
    jockey,
    weight,
    odds,
    overall,
    note:
      overall < 100
        ? "枠順・馬番・騎手・斤量・オッズは未取得（暫定分析）"
        : "Entry 情報充足",
  };
}

export function confidenceFromEntryCompleteness(baseConfidence, completeness) {
  const base = Number(baseConfidence);
  const overall = Number(completeness?.overall);
  if (!Number.isFinite(base) || !Number.isFinite(overall)) return base || null;
  return Math.max(5, Math.min(99, Math.round(base * 0.55 + overall * 0.45)));
}

export const HorseEntryCompleteness = {
  compute: computeEntryCompleteness,
  blendConfidence: confidenceFromEntryCompleteness,
};
