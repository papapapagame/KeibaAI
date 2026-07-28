/* ========================================
   News Normalizer — Ver8.0
   ======================================== */

import {
  NEWS_CATEGORY_LABEL,
  normalizeNewsCategory,
} from "./news-categories.js";

/**
 * 公開メタデータを構造化（本文なし）
 */
export function normalizeNewsItems(items = [], options = {}) {
  return (items || []).map((raw, idx) => normalizeOne(raw, idx, options));
}

function normalizeOne(raw = {}, idx = 0, options = {}) {
  const category = normalizeNewsCategory(raw.category);
  const id =
    raw.id ||
    `news_${String(raw.publishedAt || idx)}_${hashLite(raw.title || "")}`;

  return {
    id,
    publishedAt: raw.publishedAt || null,
    title: String(raw.title || "").trim(),
    category,
    categoryLabel: NEWS_CATEGORY_LABEL[category] || "その他",
    raceNumber:
      raw.raceNumber != null
        ? Number(raw.raceNumber)
        : options.raceNumber != null
          ? Number(options.raceNumber)
          : null,
    venueId: raw.venueId || options.venueId || null,
    horses: (raw.horses || []).map(String).filter(Boolean),
    jockeys: (raw.jockeys || []).map(String).filter(Boolean),
    trainers: (raw.trainers || []).map(String).filter(Boolean),
    source: String(raw.source || "unknown"),
    updatedAt: raw.updatedAt || raw.publishedAt || null,
    updateCount: Math.max(1, Number(raw.updateCount) || 1),
    importanceHint: raw.importanceHint || null,
    // 明示的に本文フィールドを持たない
  };
}

function hashLite(s) {
  let h = 0;
  const str = String(s);
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).slice(0, 6);
}

export const NewsNormalizer = {
  normalize: normalizeNewsItems,
  normalizeOne,
};
