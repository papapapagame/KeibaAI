/* ========================================
   Final IQ Score — Ver5.4
   Horse / Race / Odds / History / Market 統合
   ======================================== */

import { clamp } from "./utils.js";

/**
 * 既存 Intelligence Engine 結果 + Market を統合し Final IQ を生成。
 * ai-engine / thinking-engine には触れない。
 */
export function buildFinalIqScore(engineResult = {}, marketScores = {}) {
  const a = engineResult.analyzers || {};
  const baseIq = Number(engineResult.scores?.iqScore) || 60;

  const horse = clamp(a.horse?.top?.[0]?.score ?? baseIq);
  const race = clamp(a.race?.raceLevel ?? 65);
  const odds = clamp(a.odds?.valueScore ?? engineResult.scores?.valueScore ?? 55);
  const history = clamp(a.history?.reliability ?? engineResult.scores?.trustScore ?? 55);

  const marketBlend = clamp(
    (marketScores.supportScore || 50) * 0.28 +
      (marketScores.valueOpportunity || 50) * 0.27 +
      (marketScores.trendScore || 50) * 0.18 +
      (marketScores.marketConfidence || 50) * 0.15 +
      (100 - (marketScores.riskScore || 45)) * 0.12
  );

  const finalIqScore = clamp(
    horse * 0.28 +
      race * 0.12 +
      odds * 0.18 +
      history * 0.12 +
      marketBlend * 0.22 +
      baseIq * 0.08
  );

  return {
    finalIqScore,
    components: {
      horseAnalyzer: horse,
      raceAnalyzer: race,
      oddsAnalyzer: odds,
      historyAnalyzer: history,
      marketAnalyzer: marketBlend,
      baseIq,
    },
    weights: {
      horse: 0.28,
      race: 0.12,
      odds: 0.18,
      history: 0.12,
      market: 0.22,
      base: 0.08,
    },
  };
}
