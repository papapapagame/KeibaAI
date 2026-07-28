/* ========================================
   Market SentimentAnalyzer — Ver5.4
   ======================================== */

import { clamp } from "../utils.js";

export function analyzeMarketSentiment(context = {}) {
  const news = context.newsAnalysis || {};
  const social = context.socialAnalysis || {};
  const buzz = context.buzzAnalysis || {};
  const started = Date.now();

  const good = news.evaluation?.goodMaterial ?? 50;
  const bad = news.evaluation?.badMaterial ?? 40;
  const supportSocial = social.metrics?.supportRate ?? 50;
  const deny = social.metrics?.denyRate ?? 20;

  const supportScore = clamp(good * 0.4 + supportSocial * 0.45 + (100 - deny) * 0.15);
  const riskScore = clamp(
    bad * 0.35 +
      deny * 0.25 +
      (news.evaluation?.riskFromNews || 30) * 0.25 +
      (100 - (buzz.buzzScore || 50)) * 0.15
  );

  let label = "中立";
  if (supportScore >= 70 && riskScore < 45) label = "強気";
  else if (supportScore >= 58) label = "やや強気";
  else if (riskScore >= 70) label = "弱気";
  else if (supportScore < 45) label = "やや弱気";

  return {
    analyzer: "SentimentAnalyzer",
    status: "ONLINE",
    fetchedCount: (news.fetchedCount || 0) + (social.fetchedCount || 0),
    analyzedCount: (news.analyzedCount || 0) + (social.analyzedCount || 0),
    supportScore,
    riskScore,
    marketSentiment: label,
    responseMs: Date.now() - started,
    updatedAt: new Date().toISOString(),
  };
}
