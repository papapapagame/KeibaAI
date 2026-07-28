/* ========================================
   CombinationOptimizer — Ver6.0
   ======================================== */

import { estimatePoints } from "./ticket-generator.js";
import { clamp, toNum } from "./utils.js";
import { riskLevelFromScore } from "./risk-analyzer.js";

const STRATEGY_PROFILES = {
  安全型: { prefer: ["複勝", "ワイド", "馬連"], riskCap: 45, valueBias: 0.3 },
  期待値型: { prefer: ["単勝", "馬単", "三連単"], riskCap: 75, valueBias: 0.9 },
  穴狙い型: { prefer: ["三連単", "三連複", "単勝"], riskCap: 90, valueBias: 0.7 },
  バランス型: { prefer: ["三連複", "馬連", "ワイド"], riskCap: 65, valueBias: 0.55 },
};

export function optimizeCombinations(tickets = [], context = {}) {
  const valueMap = new Map(
    (context.valueAnalysis?.horses || []).map((h) => [h.number, h])
  );
  const risk = context.riskAnalysis || {};
  const scores = context.scores || {};
  const market = context.marketScores || {};
  const strategy = context.strategy || "バランス型";
  const profile = STRATEGY_PROFILES[strategy] || STRATEGY_PROFILES["バランス型"];

  const enriched = tickets.map((t) => {
    const points = estimatePoints(t);
    const horseValues = (t.numbers || []).map(
      (n) => valueMap.get(n)?.expectedValue || 50
    );
    const avgEv = horseValues.length
      ? horseValues.reduce((s, v) => s + v, 0) / horseValues.length
      : 50;
    const preferBoost = profile.prefer.includes(t.type) ? 12 : 0;
    const iqBoost = toNum(scores.iqScore ?? scores.finalIqScore, 60) * 0.08;
    const marketBoost = toNum(market.supportScore, 50) * 0.05;
    const riskPenalty =
      toNum(risk.riskScore, 50) > profile.riskCap ? 15 : 0;
    const score = clamp(
      avgEv * profile.valueBias +
        preferBoost +
        iqBoost +
        marketBoost +
        (100 - riskPenalty) * 0.15 -
        Math.max(0, points - 6) * 2
    );
    const confidence = clamp(
      score * 0.55 +
        toNum(scores.trustScore, 60) * 0.25 +
        (100 - toNum(risk.riskScore, 50)) * 0.2
    );
    const ticketRisk = clamp(
      toNum(risk.riskScore, 50) * 0.6 + Math.min(40, points * 3)
    );

    return {
      ...t,
      points,
      expectedValue: Math.round(avgEv),
      score,
      confidence,
      riskScore: ticketRisk,
      riskLevel: riskLevelFromScore(ticketRisk),
      roiForecast: clamp(avgEv * (1.1 - points * 0.02)),
    };
  });

  enriched.sort((a, b) => b.score - a.score);
  return enriched;
}

export function buildStrategyVariants(baseTickets, context) {
  const names = ["安全型", "期待値型", "穴狙い型", "バランス型"];
  const out = {};
  for (const name of names) {
    out[name] = optimizeCombinations(baseTickets, {
      ...context,
      strategy: name,
    }).slice(0, 12);
  }
  return out;
}

export { STRATEGY_PROFILES };
