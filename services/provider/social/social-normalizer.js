/* ========================================
   SocialNormalizer — Ver10.5
   Unified Social + Trend/Attention/Momentum/Confidence
   ======================================== */

import { createSocial } from "../../models/unified.js";
import { analyzeTrends } from "../../social/trend-analyzer.js";

export const SOCIAL_NORMALIZER_VERSION = "10.5.0";

export function normalizeRealSocial(acceptedItems = [], meta = {}, options = {}) {
  const items = (acceptedItems || []).map((n) => ({
    ...n,
    source: n.source || "real",
    providerId: options.providerId || meta.providerId || "real-social",
    providerName: n.providerName || meta.providerName || "Real Social",
  }));

  const trends = analyzeTrends(items, { now: Date.now() });
  const scores = trends?.scores || {};
  const socialModel = createSocial({
    available: true,
    itemCount: items.length,
    totalPosts: trends?.totalPosts || 0,
    trendChange: trends?.trendChange || 0,
    scores,
    categories: trends?.categories || [],
    topCategories: trends?.topCategories || [],
    horses: trends?.horses || [],
    importantTopics: trends?.importantTopics || [],
    updatedAt: meta.updatedAt || new Date().toISOString(),
    providerId: options.providerId || meta.providerId || "real-social",
    mode: "real",
    analysisStage: options.stage ?? null,
  });

  return {
    items,
    trends,
    socialModel,
    scores: {
      trendScore: scores.trend ?? null,
      attentionScore: scores.attention ?? null,
      momentumScore: scores.momentum ?? null,
      confidenceScore: scores.confidence ?? null,
    },
    fingerprint: fingerprintSocialItems(items, trends),
    version: SOCIAL_NORMALIZER_VERSION,
  };
}

export function fingerprintSocialItems(items = [], trends = null) {
  const ids = (items || [])
    .map(
      (n) =>
        `${n.id}|${n.topicKey}|${n.category}|${n.updatedAt}|${n.postCount}|${(n.horses || []).join(",")}`
    )
    .sort()
    .join("\n");
  const scores = trends?.scores
    ? `${trends.scores.trend}:${trends.scores.attention}:${trends.scores.momentum}:${trends.scores.confidence}`
    : "";
  return `${ids}\n#${scores}#${trends?.totalPosts || 0}`;
}

export const SocialNormalizer = {
  normalize: normalizeRealSocial,
  fingerprint: fingerprintSocialItems,
  version: SOCIAL_NORMALIZER_VERSION,
};
