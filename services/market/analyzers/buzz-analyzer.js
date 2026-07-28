/* ========================================
   BuzzAnalyzer — Ver5.4
   ======================================== */

import { clamp } from "../utils.js";

export function analyzeBuzz(context = {}) {
  const social = context.socialAnalysis || {};
  const news = context.newsAnalysis || {};
  const trends = context.aiInput?.trends || [];
  const started = Date.now();

  const trendVolume = trends.reduce(
    (s, t) => s + Number(t.volume || 0) + Number(t.score || 0) * 0.25,
    0
  );
  const socialBuzz = social.metrics?.buzz ?? 45;
  const newsAttention = news.evaluation?.attention ?? 40;

  const buzzScore = clamp(
    socialBuzz * 0.45 + newsAttention * 0.3 + Math.min(40, trendVolume) * 0.4
  );
  const marketHeat = clamp(
    buzzScore * 0.55 + (social.metrics?.topicHeat || 40) * 0.45
  );

  return {
    analyzer: "BuzzAnalyzer",
    status: "ONLINE",
    fetchedCount: trends.length + (social.analyzedCount || 0),
    analyzedCount: trends.length + 1,
    buzzScore,
    marketHeat,
    risingWords: social.metrics?.risingWords || [],
    responseMs: Date.now() - started,
    updatedAt: new Date().toISOString(),
  };
}
