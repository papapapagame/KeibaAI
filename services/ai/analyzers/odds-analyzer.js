/* ========================================
   OddsAnalyzer — Ver5.3
   人気乖離 / 期待値 / 過剰人気 / 妙味 / 穴馬判定
   ======================================== */

import { clamp, horseName, toNum } from "../utils.js";

export function analyzeOdds(context = {}) {
  const horses = Array.isArray(context.horses) ? context.horses : [];
  const horseIntel = context.horseAnalysis?.horses || [];
  const byNumber = new Map(horseIntel.map((h) => [Number(h.number), h]));

  const rows = horses.map((h) => {
    const intel = byNumber.get(Number(h.number)) || {};
    const odds = toNum(h.odds, 99);
    const pop = toNum(h.popularity, 18);
    const ability = toNum(intel.score, 55);
    // 能力順位相当の仮想人気
    const impliedPop = Math.max(1, Math.round((100 - ability) / 6));
    const divergence = clamp(50 + (impliedPop - pop) * 6);
    const fairOdds = Math.max(1.4, (100 - ability) / 8);
    const expectedValue = clamp((ability / 100) * odds * 22);
    const overbet = pop <= 3 && ability < 62;
    const valueEdge = odds > fairOdds * 1.15 && ability >= 58;
    const upset =
      pop >= 6 && ability >= 64 && odds >= 8 && expectedValue >= 55;

    return {
      number: h.number,
      name: horseName(h),
      odds,
      popularity: pop,
      divergence,
      expectedValue,
      overbet,
      valueEdge,
      upset,
      fairOdds: Math.round(fairOdds * 10) / 10,
      mystique: clamp((valueEdge ? 18 : 0) + (upset ? 22 : 0) + divergence * 0.35),
    };
  });

  const rankedEv = [...rows].sort((a, b) => b.expectedValue - a.expectedValue);
  const upsets = rows.filter((r) => r.upset);
  const overbetList = rows.filter((r) => r.overbet);

  return {
    analyzer: "OddsAnalyzer",
    horses: rows,
    rankedEv,
    upsets,
    overbetList,
    valueScore: clamp(avgOf(rows.map((r) => r.mystique))),
  };
}

function avgOf(list) {
  if (!list.length) return 50;
  return list.reduce((s, v) => s + v, 0) / list.length;
}
