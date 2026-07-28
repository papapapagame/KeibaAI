/* ========================================
   NewsMetadataExtractor — Ver10.4
   構造化メタデータのみ抽出（本文禁止）
   ======================================== */

import {
  NEWS_CATEGORY_LABEL,
  normalizeNewsCategory,
} from "../../news/news-categories.js";

export const NEWS_METADATA_EXTRACTOR_VERSION = "10.4.0";

export function extractNewsMetadata(parsed = {}, options = {}) {
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const raceNumber =
    options.raceNumber != null
      ? Number(options.raceNumber)
      : parsed.meta?.raceNumber != null
        ? Number(parsed.meta.raceNumber)
        : null;
  const venueId = options.venueId || parsed.meta?.venueId || null;
  const providerName =
    parsed.meta?.providerName || parsed.providerId || "Real News";

  const extracted = items.map((raw, index) => {
    const category = normalizeNewsCategory(raw.category);
    return {
      id: String(raw.id || `rn_meta_${index + 1}`),
      title: String(raw.title || "").trim(),
      publishedAt: raw.publishedAt || null,
      updatedAt: raw.updatedAt || raw.publishedAt || null,
      raceNumber:
        raw.raceNumber != null && Number.isFinite(Number(raw.raceNumber))
          ? Number(raw.raceNumber)
          : raceNumber,
      venueId: raw.venueId || venueId,
      horses: normalizeNameList(raw.horses),
      jockeys: normalizeNameList(raw.jockeys),
      trainers: normalizeNameList(raw.trainers),
      category,
      categoryLabel: NEWS_CATEGORY_LABEL[category] || category,
      source: String(raw.source || "unknown").trim() || "unknown",
      updateCount: Math.max(1, Number(raw.updateCount) || 1),
      importanceHint: raw.importanceHint || null,
      providerName: raw.providerName || providerName,
    };
  });

  return {
    providerId: parsed.providerId || "real-news",
    items: extracted,
    meta: {
      ...(parsed.meta || {}),
      raceNumber,
      venueId,
      providerName,
      extractedAt: new Date().toISOString(),
    },
    version: NEWS_METADATA_EXTRACTOR_VERSION,
    count: extracted.length,
  };
}

function normalizeNameList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

export const NewsMetadataExtractor = {
  extract: extractNewsMetadata,
  version: NEWS_METADATA_EXTRACTOR_VERSION,
};
