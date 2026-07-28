/* ========================================
   Market Score Builder — Ver5.4
   ======================================== */

import { clamp } from "./utils.js";

export function buildMarketScores(parts = {}) {
  const sentiment = parts.sentimentAnalysis || {};
  const buzz = parts.buzzAnalysis || {};
  const trend = parts.trendAnalysis || {};
  const news = parts.newsAnalysis || {};
  const social = parts.socialAnalysis || {};
  const odds = parts.engineResult?.analyzers?.odds;
  const tip = parts.tipSiteAnalysis || {};

  const supportScore = clamp(sentiment.supportScore ?? 50);
  const buzzScore = clamp(buzz.buzzScore ?? 50);
  const riskScore = clamp(sentiment.riskScore ?? 45);
  const trendScore = clamp(trend.trendScore ?? 55);
  const marketHeat = clamp(buzz.marketHeat ?? buzzScore);
  const publicExpectation = clamp(trend.publicExpectation ?? 55);

  const valueFromOdds = odds?.valueScore ?? 50;
  const valueOpportunity = clamp(
    valueFromOdds * 0.55 +
      (100 - publicExpectation) * 0.2 +
      supportScore * 0.15 +
      (100 - riskScore) * 0.1
  );

  const sourceDepth =
    (news.analyzedCount || 0) +
    (social.analyzedCount || 0) +
    (tip.analyzedCount || 0);
  const marketConfidence = clamp(
    48 +
      Math.min(20, sourceDepth * 3) +
      (100 - riskScore) * 0.12 +
      supportScore * 0.1
  );

  return {
    supportScore,
    buzzScore,
    riskScore,
    trendScore,
    marketConfidence,
    marketHeat,
    publicExpectation,
    valueOpportunity,
    marketSentiment: sentiment.marketSentiment || "中立",
  };
}
