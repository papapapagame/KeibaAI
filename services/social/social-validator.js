/* ========================================
   Social Validator — Ver8.1
   ======================================== */

import {
  SOCIAL_CATEGORY_SET,
  SOCIAL_CATEGORY_LABEL,
  normalizeSocialCategory,
} from "./social-categories.js";

export function validateSocialItems(items = [], options = {}) {
  const errors = [];
  const warnings = [];
  const sanitized = [];
  const seenIds = new Set();
  const seenTopics = new Set();
  const expectRace =
    options.raceNumber != null ? Number(options.raceNumber) : null;

  for (const raw of items || []) {
    const {
      body: _b,
      text: _t,
      content: _c,
      post: _p,
      comment: _cm,
      image: _i,
      video: _v,
      ...safe
    } = raw || {};

    const id = String(safe.id || "").trim();
    const topicKey = String(safe.topicKey || "").trim();
    const category = normalizeSocialCategory(safe.category);
    const publishedAt = safe.publishedAt || null;
    const raceNumber =
      safe.raceNumber != null ? Number(safe.raceNumber) : null;
    const horses = Array.isArray(safe.horses) ? safe.horses : [];

    if (!topicKey && !id) {
      errors.push({ code: "REQUIRED", message: "topicKey/id 必須欠損" });
      continue;
    }
    if (!publishedAt || Number.isNaN(Date.parse(publishedAt))) {
      errors.push({
        code: "TYPE",
        message: `投稿日時異常: ${topicKey || id}`,
      });
      continue;
    }
    if (!SOCIAL_CATEGORY_SET.has(category)) {
      errors.push({
        code: "CATEGORY",
        message: `カテゴリ不正: ${safe.category}`,
      });
      continue;
    }
    if (expectRace != null && raceNumber != null && raceNumber !== expectRace) {
      warnings.push({
        code: "RACE",
        message: `対象レース不一致: ${topicKey || id}`,
      });
    }
    if (id && seenIds.has(id)) {
      errors.push({ code: "DUP", message: `ID重複: ${id}` });
      continue;
    }
    if (topicKey && seenTopics.has(topicKey)) {
      errors.push({ code: "DUP", message: `話題重複: ${topicKey}` });
      continue;
    }
    if (
      category !== "meeting" &&
      category !== "other" &&
      horses.length === 0 &&
      !(safe.jockeys || []).length
    ) {
      warnings.push({
        code: "HORSE",
        message: `対象馬/騎手なし: ${topicKey || id}`,
      });
    }

    if (id) seenIds.add(id);
    if (topicKey) seenTopics.add(topicKey);

    sanitized.push({
      ...safe,
      id: id || `auto_${seenTopics.size || seenIds.size}`,
      topicKey: topicKey || id || `topic_${sanitized.length}`,
      category,
      categoryLabel: SOCIAL_CATEGORY_LABEL[category] || "その他",
      publishedAt,
      raceNumber,
      horses,
      jockeys: Array.isArray(safe.jockeys) ? safe.jockeys : [],
      trainers: Array.isArray(safe.trainers) ? safe.trainers : [],
      postType: safe.postType || "topic",
      source: safe.source || "unknown",
      updatedAt: safe.updatedAt || publishedAt,
      postCount: Math.max(0, Number(safe.postCount) || 0),
      prevPostCount:
        safe.prevPostCount != null
          ? Math.max(0, Number(safe.prevPostCount))
          : null,
    });
  }

  return {
    ok: errors.length === 0 && sanitized.length > 0,
    errors,
    warnings,
    sanitized,
  };
}

export const SocialValidator = { validate: validateSocialItems };
