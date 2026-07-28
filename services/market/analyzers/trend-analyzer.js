/* ========================================
   Market TrendAnalyzer — Ver5.4
   ======================================== */

import { avg, clamp, toNum } from "../utils.js";

export function analyzeMarketTrend(context = {}) {
  const horses = Array.isArray(context.horses) ? context.horses : [];
  const intelTrend = context.engineResult?.analyzers?.trend;
  const started = Date.now();

  const recentScores = horses.map((h) => {
    const last3 = (h.last3 || []).map(Number);
    if (last3.length < 2) return 55;
    return last3[0] < last3[last3.length - 1] ? 42 : 68;
  });

  const base = intelTrend?.trendScore != null ? intelTrend.trendScore : avg(recentScores);
  const popPressure = clamp(
    50 +
      horses.filter((h) => toNum(h.popularity, 99) <= 3).length * 4 -
      horses.filter((h) => toNum(h.odds, 99) >= 30).length * 2
  );

  const trendScore = clamp(base * 0.65 + popPressure * 0.35);

  return {
    analyzer: "TrendAnalyzer",
    status: "ONLINE",
    fetchedCount: horses.length,
    analyzedCount: horses.length,
    trendScore,
    publicExpectation: clamp(popPressure),
    responseMs: Date.now() - started,
    updatedAt: new Date().toISOString(),
  };
}
