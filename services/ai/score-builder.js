/* ========================================
   Score Builder — IQ Score & satellite scores
   Ver5.3
   ======================================== */

import { clamp } from "./utils.js";

/**
 * 独自指数を統合生成（0〜100）
 */
export function buildScores(parts = {}) {
  const raceA = parts.raceAnalysis || {};
  const paceA = parts.paceAnalysis || {};
  const oddsA = parts.oddsAnalysis || {};
  const trendA = parts.trendAnalysis || {};
  const sentimentA = parts.sentimentAnalysis || {};
  const trackA = parts.trackAnalysis || {};
  const historyA = parts.historyAnalysis || {};
  const horseA = parts.horseAnalysis || {};

  const topHorse = horseA.top?.[0];
  const topEv = oddsA.rankedEv?.[0];

  const paceScore = clamp(paceA.paceScore ?? raceA.paceScore ?? 55);
  const valueScore = clamp(
    oddsA.valueScore ?? topEv?.expectedValue ?? 50
  );
  const trustScore = clamp(
    (historyA.reliability || 50) * 0.45 +
      (topHorse?.stability || 55) * 0.35 +
      (100 - (sentimentA.riskScore || 40)) * 0.2
  );
  const dangerScore = clamp(
    (raceA.complexity || 50) * 0.35 +
      (sentimentA.riskScore || 40) * 0.35 +
      (oddsA.overbetList?.length || 0) * 6 +
      20
  );
  const trendScore = clamp(trendA.trendScore ?? 55);
  const buzzScore = clamp(sentimentA.buzzScore ?? 50);
  const supportScore = clamp(sentimentA.supportScore ?? 50);
  const riskScore = clamp(sentimentA.riskScore ?? 45);

  // IQ Score: 能力・期待値・信頼・展開適合の合成
  const iqScore = clamp(
    (topHorse?.score || 60) * 0.34 +
      valueScore * 0.22 +
      trustScore * 0.18 +
      (100 - dangerScore) * 0.12 +
      trendScore * 0.08 +
      (trackA.trackScore || 55) * 0.06
  );

  return {
    iqScore,
    paceScore,
    valueScore,
    trustScore,
    dangerScore,
    trendScore,
    buzzScore,
    supportScore,
    riskScore,
    marketSentiment: sentimentA.marketSentiment || "中立",
  };
}
