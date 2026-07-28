/* ========================================
   ValueAnalyzer — Ver6.0
   ======================================== */

import { clamp, horseName, toNum } from "./utils.js";

export function analyzeValue(context = {}) {
  const horses = Array.isArray(context.horses) ? context.horses : [];
  const scores = context.scores || {};
  const market = context.marketScores || {};

  const rows = horses.map((h) => {
    const odds = toNum(h.odds, 20);
    const pop = toNum(h.popularity, 10);
    const iq = toNum(h.iq || h.thinking?.score || h.indexes?.total / 10, 55);
    const ability = clamp(iq);
    const fairOdds = Math.max(1.5, (105 - ability) / 7);
    const expectedValue = clamp((ability / 100) * odds * 18);
    const valueEdge = odds > fairOdds * 1.12;
    const overbet = pop <= 3 && ability < 60;
    const underbet = pop >= 6 && ability >= 65;
    const mystique = clamp(
      (valueEdge ? 20 : 0) +
        (underbet ? 18 : 0) +
        expectedValue * 0.35 +
        toNum(market.valueOpportunity, 50) * 0.15
    );

    return {
      number: h.number,
      name: horseName(h),
      odds,
      popularity: pop,
      ability,
      fairOdds: Math.round(fairOdds * 10) / 10,
      expectedValue,
      roiForecast: clamp(expectedValue * 1.05),
      valueEdge,
      overbet,
      underbet,
      mystique,
      label: overbet
        ? "過剰人気"
        : underbet
          ? "過小評価"
          : valueEdge
            ? "オッズ妙味"
            : "中立",
    };
  });

  const avgEv = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.expectedValue, 0) / rows.length)
    : 50;

  return {
    analyzer: "ValueAnalyzer",
    status: "ONLINE",
    horses: rows.sort((a, b) => b.expectedValue - a.expectedValue),
    raceExpectedValue: clamp(
      avgEv * 0.7 + toNum(scores.valueScore ?? market.valueOpportunity, 55) * 0.3
    ),
    roiForecast: clamp(avgEv * 1.02),
  };
}
