/* ========================================
   Social Normalizer — Ver8.1
   ======================================== */

import {
  SOCIAL_CATEGORY_LABEL,
  normalizeSocialCategory,
} from "./social-categories.js";

export function normalizeSocialItems(items = [], options = {}) {
  return (items || []).map((raw, idx) => normalizeOne(raw, idx, options));
}

function normalizeOne(raw = {}, idx = 0, options = {}) {
  const category = normalizeSocialCategory(raw.category);
  const id =
    raw.id ||
    `social_${String(raw.topicKey || idx)}_${hashLite(raw.topicKey || raw.category || "")}`;

  return {
    id,
    publishedAt: raw.publishedAt || null,
    topicKey: raw.topicKey || id,
    category,
    categoryLabel: SOCIAL_CATEGORY_LABEL[category] || "その他",
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
    postType: String(raw.postType || "topic"),
    source: String(raw.source || "unknown"),
    updatedAt: raw.updatedAt || raw.publishedAt || null,
    postCount: Math.max(0, Number(raw.postCount) || 0),
    prevPostCount:
      raw.prevPostCount != null ? Math.max(0, Number(raw.prevPostCount)) : null,
    importanceHint: raw.importanceHint || null,
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

export const SocialNormalizer = {
  normalize: normalizeSocialItems,
};
