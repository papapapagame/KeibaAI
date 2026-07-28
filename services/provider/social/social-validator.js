/* ========================================
   SocialValidator — Ver10.5（Provider 層）
   重複・カテゴリ・投稿日時・必須項目
   ======================================== */

import { SOCIAL_CATEGORY_SET } from "../../social/social-categories.js";

export const SOCIAL_PROVIDER_VALIDATOR_VERSION = "10.5.0";

export function validateRealSocial(extracted = {}, options = {}) {
  const errors = [];
  const warnings = [];
  const rejected = [];
  const acceptedItems = [];
  const items = Array.isArray(extracted.items) ? extracted.items : [];
  const seenIds = new Set();
  const seenKeys = new Set();
  const raceNumber =
    options.raceNumber != null ? Number(options.raceNumber) : null;

  if (!items.length) {
    return {
      ok: false,
      errors: [{ code: "EMPTY", message: "SNSデータが空です" }],
      warnings: [],
      acceptedItems: [],
      rejectedCount: 0,
      version: SOCIAL_PROVIDER_VALIDATOR_VERSION,
    };
  }

  for (const raw of items) {
    const itemErrors = [];
    const itemWarnings = [];

    const id = String(raw.id || "").trim();
    const topicKey = String(raw.topicKey || "").trim();
    const publishedAt = raw.publishedAt || null;
    const category = String(raw.category || "").trim();

    if (!id) {
      itemErrors.push({ code: "REQUIRED", message: "ID必須欠損" });
    } else if (seenIds.has(id)) {
      itemErrors.push({ code: "DUP", message: `ID重複: ${id}` });
    }

    if (!topicKey) {
      itemErrors.push({ code: "REQUIRED", message: "トピック必須欠損" });
    }

    if (!publishedAt) {
      itemErrors.push({ code: "REQUIRED", message: "投稿日時必須欠損" });
    } else if (Number.isNaN(Date.parse(publishedAt))) {
      itemErrors.push({ code: "TYPE", message: "投稿日時型異常" });
    }

    if (!category) {
      itemErrors.push({ code: "REQUIRED", message: "カテゴリ必須欠損" });
    } else if (!SOCIAL_CATEGORY_SET.has(category)) {
      itemErrors.push({
        code: "CATEGORY",
        message: `カテゴリ不正: ${category}`,
      });
    }

    const dupKey = `${topicKey}|${publishedAt}|${category}`;
    if (topicKey && publishedAt && category && seenKeys.has(dupKey)) {
      itemErrors.push({ code: "DUP", message: `トピック重複: ${topicKey}` });
    }

    const postCount = Number(raw.postCount);
    if (!Number.isFinite(postCount) || postCount < 0) {
      itemErrors.push({ code: "RANGE", message: "投稿数異常" });
    }

    if (
      raceNumber != null &&
      raw.raceNumber != null &&
      Number(raw.raceNumber) !== raceNumber
    ) {
      itemWarnings.push({
        code: "RACE",
        message: `対象レース不一致: ${raw.raceNumber}`,
      });
    }

    if (!raw.source || raw.source === "unknown") {
      itemWarnings.push({ code: "MISSING", message: "情報ソース欠損" });
    }

    if (itemErrors.length) {
      errors.push(...itemErrors.map((e) => ({ ...e, id })));
      rejected.push({ id, topicKey, errors: itemErrors });
      continue;
    }

    seenIds.add(id);
    seenKeys.add(dupKey);
    warnings.push(...itemWarnings.map((w) => ({ ...w, id })));

    acceptedItems.push({
      id,
      publishedAt,
      updatedAt: raw.updatedAt || publishedAt,
      topicKey,
      category,
      categoryLabel: raw.categoryLabel || category,
      raceNumber:
        raw.raceNumber != null && Number.isFinite(Number(raw.raceNumber))
          ? Number(raw.raceNumber)
          : null,
      venueId: raw.venueId || null,
      horses: Array.isArray(raw.horses) ? raw.horses : [],
      jockeys: Array.isArray(raw.jockeys) ? raw.jockeys : [],
      trainers: Array.isArray(raw.trainers) ? raw.trainers : [],
      postType: raw.postType || "topic",
      source: raw.source || "unknown",
      postCount: Math.max(0, Number(raw.postCount) || 0),
      prevPostCount:
        raw.prevPostCount != null && Number.isFinite(Number(raw.prevPostCount))
          ? Number(raw.prevPostCount)
          : null,
      trendChangeRate:
        raw.trendChangeRate != null ? Number(raw.trendChangeRate) : null,
      attention: raw.attention != null ? Number(raw.attention) : null,
      importanceHint: raw.importanceHint || null,
      providerName:
        raw.providerName || extracted.meta?.providerName || "Real Social",
    });
  }

  return {
    ok: errors.length === 0 && acceptedItems.length > 0,
    errors,
    warnings,
    acceptedItems,
    rejectedCount: rejected.length,
    rejected,
    version: SOCIAL_PROVIDER_VALIDATOR_VERSION,
  };
}

export const SocialValidator = {
  validate: validateRealSocial,
  version: SOCIAL_PROVIDER_VALIDATOR_VERSION,
};
