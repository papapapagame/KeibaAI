/* ========================================
   NewsNormalizer — Ver10.4
   Unified News + Freshness/Importance/Reliability/Coverage
   ======================================== */

import { createNews } from "../../models/unified.js";
import { scoreNewsItems } from "../../news/news-scoring-engine.js";

export const NEWS_NORMALIZER_VERSION = "10.4.0";

export function normalizeRealNews(acceptedItems = [], meta = {}, options = {}) {
  const scored = scoreNewsItems(acceptedItems || []);
  const items = (scored.items || []).map((n) => ({
    ...n,
    source: n.source || "real",
    providerId: options.providerId || meta.providerId || "real-news",
    providerName: n.providerName || meta.providerName || "Real News",
  }));

  const newsModels = items.map((n) =>
    createNews({
      ...n,
      analysisStage: options.stage ?? null,
    })
  );

  return {
    items,
    newsModels,
    aggregate: scored.aggregate || {},
    scores: {
      freshnessScore: scored.aggregate?.freshness ?? null,
      importanceScore: scored.aggregate?.importance ?? null,
      reliabilityScore: scored.aggregate?.reliability ?? null,
      coverageScore: scored.aggregate?.coverage ?? null,
      newsScore: computeNewsScore(scored.aggregate || {}),
    },
    fingerprint: fingerprintNewsItems(items),
    version: NEWS_NORMALIZER_VERSION,
  };
}

export function computeNewsScore(aggregate = {}) {
  const parts = [
    Number(aggregate.freshness ?? aggregate.avgFreshness),
    Number(aggregate.importance ?? aggregate.avgImportance),
    Number(aggregate.reliability ?? aggregate.avgReliability),
    Number(aggregate.coverage ?? aggregate.coverageScore),
  ].filter((n) => Number.isFinite(n));
  if (!parts.length) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

export function fingerprintNewsItems(items = []) {
  return (items || [])
    .map(
      (n) =>
        `${n.id}|${n.title}|${n.category}|${n.updatedAt}|${n.updateCount}|${(n.horses || []).join(",")}`
    )
    .sort()
    .join("\n");
}

export const NewsNormalizer = {
  normalize: normalizeRealNews,
  fingerprint: fingerprintNewsItems,
  newsScore: computeNewsScore,
  version: NEWS_NORMALIZER_VERSION,
};
