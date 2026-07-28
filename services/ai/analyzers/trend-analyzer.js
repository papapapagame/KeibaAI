/* ========================================
   TrendAnalyzer — Ver5.3
   近走トレンド / 季節 / 開催相性 / 騎手 / 厩舎
   ======================================== */

import { avg, clamp, horseName, toNum } from "../utils.js";

export function analyzeTrend(context = {}) {
  const horses = Array.isArray(context.horses) ? context.horses : [];
  const histories = context.aiInput?.histories || [];
  const race = context.race || {};
  const month = Number(String(race.date || "").slice(5, 7)) || 7;

  const jockeyHits = {};
  const trainerHits = {};
  for (const h of horses) {
    const j = h.jockey || "不明";
    const t = h.trainer || "不明";
    jockeyHits[j] = (jockeyHits[j] || 0) + toNum(h.winRate, 5);
    trainerHits[t] = (trainerHits[t] || 0) + toNum(h.placeRate, 10);
  }

  const rows = horses.map((h) => {
    const last3 = (h.last3 || []).map(Number);
    const recentTrend =
      last3.length >= 2
        ? last3[0] < last3[last3.length - 1]
          ? "下降"
          : last3[0] > last3[last3.length - 1]
            ? "上昇"
            : "横ばい"
        : "不明";
    const venueHist = histories.filter(
      (x) =>
        (Number(x.horseNumber) === Number(h.number) ||
          x.horseName === horseName(h)) &&
        String(x.venue || "").includes(String(race.venueLabel || "").slice(0, 2))
    );
    const venueFit = venueHist.length
      ? clamp(75 - avg(venueHist.map((x) => toNum(x.finish, 8))) * 6)
      : 55;

    const seasonFit = clamp(50 + ((month >= 6 && month <= 9) ? 8 : 0));

    return {
      number: h.number,
      name: horseName(h),
      recentTrend,
      seasonFit,
      venueFit,
      jockeyTrend: clamp(40 + toNum(jockeyHits[h.jockey], 10) * 0.8),
      trainerTrend: clamp(40 + toNum(trainerHits[h.trainer], 10) * 0.4),
      score: clamp(
        (recentTrend === "上昇" ? 70 : recentTrend === "下降" ? 42 : 55) * 0.35 +
          venueFit * 0.25 +
          seasonFit * 0.15 +
          clamp(40 + toNum(jockeyHits[h.jockey], 10) * 0.8) * 0.15 +
          clamp(40 + toNum(trainerHits[h.trainer], 10) * 0.4) * 0.1
      ),
    };
  });

  const trendScore = clamp(avg(rows.map((r) => r.score)) || 55);

  return {
    analyzer: "TrendAnalyzer",
    horses: rows,
    trendScore,
    topJockey: topKey(jockeyHits),
    topTrainer: topKey(trainerHits),
  };
}

function topKey(map) {
  const entries = Object.entries(map || {});
  if (!entries.length) return "—";
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}
