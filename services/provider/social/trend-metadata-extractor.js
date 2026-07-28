/* ========================================
   TrendMetadataExtractor — Ver10.5
   構造化トレンドメタデータのみ抽出（本文禁止）
   ======================================== */

import {
  SOCIAL_CATEGORY_LABEL,
  normalizeSocialCategory,
} from "../../social/social-categories.js";

export const TREND_METADATA_EXTRACTOR_VERSION = "10.5.0";

export function extractTrendMetadata(parsed = {}, options = {}) {
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const raceNumber =
    options.raceNumber != null
      ? Number(options.raceNumber)
      : parsed.meta?.raceNumber != null
        ? Number(parsed.meta.raceNumber)
        : null;
  const venueId = options.venueId || parsed.meta?.venueId || null;
  const providerName =
    parsed.meta?.providerName || parsed.providerId || "Real Social";

  const extracted = items.map((raw, index) => {
    const category = normalizeSocialCategory(raw.category);
    const postCount = Math.max(0, Number(raw.postCount) || 0);
    const prevPostCount =
      raw.prevPostCount != null && Number.isFinite(Number(raw.prevPostCount))
        ? Number(raw.prevPostCount)
        : null;
    const trendChangeRate =
      prevPostCount != null && prevPostCount > 0
        ? Math.round(((postCount - prevPostCount) / prevPostCount) * 100)
        : postCount > 0
          ? 100
          : 0;

    return {
      id: String(raw.id || `rs_meta_${index + 1}`),
      publishedAt: raw.publishedAt || null,
      updatedAt: raw.updatedAt || raw.publishedAt || null,
      topicKey:
        String(raw.topicKey || raw.id || `topic_${index + 1}`).trim() ||
        `topic_${index + 1}`,
      category,
      categoryLabel: SOCIAL_CATEGORY_LABEL[category] || category,
      raceNumber:
        raw.raceNumber != null && Number.isFinite(Number(raw.raceNumber))
          ? Number(raw.raceNumber)
          : raceNumber,
      venueId: raw.venueId || venueId,
      horses: normalizeNameList(raw.horses),
      jockeys: normalizeNameList(raw.jockeys),
      trainers: normalizeNameList(raw.trainers),
      postType: String(raw.postType || "topic").trim() || "topic",
      source: String(raw.source || "unknown").trim() || "unknown",
      postCount,
      prevPostCount,
      trendChangeRate,
      attention:
        raw.attention != null && Number.isFinite(Number(raw.attention))
          ? Number(raw.attention)
          : null,
      importanceHint: raw.importanceHint || null,
      providerName: raw.providerName || providerName,
    };
  });

  return {
    providerId: parsed.providerId || "real-social",
    items: extracted,
    meta: {
      ...(parsed.meta || {}),
      raceNumber,
      venueId,
      providerName,
      extractedAt: new Date().toISOString(),
    },
    version: TREND_METADATA_EXTRACTOR_VERSION,
    count: extracted.length,
  };
}

function normalizeNameList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((v) => String(v || "").trim()).filter(Boolean);
}

export const TrendMetadataExtractor = {
  extract: extractTrendMetadata,
  version: TREND_METADATA_EXTRACTOR_VERSION,
};
