/* ========================================
   Market Intelligence Engine — Ver5.4
   市場心理分析（本文・投稿の転載/表示なし）
   ======================================== */

import { analyzeNews } from "./analyzers/news-analyzer.js";
import { analyzeSocial } from "./analyzers/social-analyzer.js";
import { analyzeBuzz } from "./analyzers/buzz-analyzer.js";
import { analyzeMarketTrend } from "./analyzers/trend-analyzer.js";
import { analyzeMarketSentiment } from "./analyzers/sentiment-analyzer.js";
import { analyzeTipSites } from "./analyzers/tip-site-analyzer.js";
import { buildMarketScores } from "./score-builder.js";
import { buildMarketExplanations } from "./explainable.js";
import { buildFinalIqScore } from "./final-iq.js";

/**
 * @param {{
 *   race?: object,
 *   horses?: object[],
 *   intelPacket?: object,
 *   engineResult?: object
 * }} input
 */
export function runMarketEngine(input = {}) {
  const race = input.race || {};
  const horses = Array.isArray(input.horses) ? input.horses : [];
  const intelPacket = input.intelPacket || {};
  const engineResult = input.engineResult || {};
  const aiInput =
    intelPacket.fusedInput?.aiInput ||
    intelPacket.aiInput ||
    intelPacket.fusedInput?.normalized ||
    {};

  const base = { race, horses, aiInput, intelPacket, engineResult };

  const newsAnalysis = analyzeNews(base);
  const socialAnalysis = analyzeSocial(base);
  const tipSiteAnalysis = analyzeTipSites(base);
  const buzzAnalysis = analyzeBuzz({
    ...base,
    newsAnalysis,
    socialAnalysis,
  });
  const trendAnalysis = analyzeMarketTrend(base);
  const sentimentAnalysis = analyzeMarketSentiment({
    ...base,
    newsAnalysis,
    socialAnalysis,
    buzzAnalysis,
  });

  const parts = {
    ...base,
    newsAnalysis,
    socialAnalysis,
    tipSiteAnalysis,
    buzzAnalysis,
    trendAnalysis,
    sentimentAnalysis,
  };

  const scores = buildMarketScores(parts);
  const explanations = buildMarketExplanations(scores);
  const finalIq = buildFinalIqScore(engineResult, scores);

  const analyzerStates = [
    newsAnalysis,
    socialAnalysis,
    buzzAnalysis,
    trendAnalysis,
    sentimentAnalysis,
    tipSiteAnalysis,
  ].map((a) => ({
    name: a.analyzer,
    status: a.status || "READY",
    fetchedCount: a.fetchedCount || 0,
    analyzedCount: a.analyzedCount || 0,
    updatedAt: a.updatedAt || null,
    responseMs: a.responseMs || 0,
  }));

  return {
    version: "5.4.0",
    engine: "Market Intelligence AI",
    generatedAt: new Date().toISOString(),
    policy: {
      displayArticleBody: false,
      displaySocialPosts: false,
      displayTipSiteContent: false,
      aiDerivedOnly: true,
    },
    analyzers: {
      news: newsAnalysis,
      social: socialAnalysis,
      buzz: buzzAnalysis,
      trend: trendAnalysis,
      sentiment: sentimentAnalysis,
      tipSites: tipSiteAnalysis,
    },
    analyzerStates,
    scores,
    explanations,
    finalIq,
    cache: {
      status: intelPacket.debug?.cache ? "AVAILABLE" : "MISS",
      updatedAt: intelPacket.collectedAt || null,
    },
  };
}
