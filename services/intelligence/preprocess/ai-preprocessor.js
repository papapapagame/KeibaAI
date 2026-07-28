/* ========================================
   PAPAPA IQ KEIBA - AI Input Preprocessor
   Ver5.2 Real Intelligence Connect
   全取得データ → 共通モデル（AI入力専用）
   ======================================== */

import { mergeNormalized, normalizeProviderItems } from "./data-normalizer.js";
import { validateIntelligenceItems } from "./validators/data-validator.js";

/**
 * Provider 生データ配列を AI 入力前処理
 * Horse / Race / Odds / History / Track / Weather / Comment / Trend
 */
export function preprocessForAi(providerBundles = []) {
  const rawByProvider = {};
  const normalizedParts = [];
  const validations = [];

  for (const bundle of providerBundles) {
    if (!bundle) continue;
    const id = bundle.providerId || "unknown";
    const items = Array.isArray(bundle.items) ? bundle.items : [];
    rawByProvider[id] = items;

    const validation = validateIntelligenceItems(items);
    validations.push({ providerId: id, ...validation });

    normalizedParts.push(normalizeProviderItems(id, items));
  }

  const normalized = mergeNormalized(normalizedParts);

  return {
    rawByProvider,
    normalized,
    validations,
    validationSummary: summarizeValidations(validations),
    aiInput: {
      horses: normalized.horses,
      races: normalized.races,
      odds: normalized.odds,
      histories: normalized.histories,
      tracks: normalized.tracks,
      weathers: normalized.weathers,
      comments: normalized.comments,
      trends: normalized.trends,
      news: normalized.news,
      aiOnly: true,
    },
    debug: {
      rawCounts: Object.fromEntries(
        Object.entries(rawByProvider).map(([k, v]) => [k, v.length])
      ),
      normalizedCounts: {
        horses: normalized.horses.length,
        races: normalized.races.length,
        odds: normalized.odds.length,
        histories: normalized.histories.length,
        tracks: normalized.tracks.length,
        weathers: normalized.weathers.length,
        comments: normalized.comments.length,
        trends: normalized.trends.length,
        news: normalized.news.length,
      },
    },
  };
}

function summarizeValidations(validations) {
  return validations.reduce(
    (acc, row) => {
      acc.issueCount += row.summary?.issueCount || 0;
      acc.missing += row.summary?.missing || 0;
      acc.anomaly += row.summary?.anomaly || 0;
      acc.duplicate += row.summary?.duplicate || 0;
      return acc;
    },
    { issueCount: 0, missing: 0, anomaly: 0, duplicate: 0 }
  );
}
