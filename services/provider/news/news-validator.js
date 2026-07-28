/* ========================================
   NewsValidator — Ver10.4（Provider 層）
   重複・カテゴリ・公開日時・必須項目
   ======================================== */

import { NEWS_CATEGORY_SET } from "../../news/news-categories.js";

export const NEWS_PROVIDER_VALIDATOR_VERSION = "10.4.0";

export function validateRealNews(extracted = {}, options = {}) {
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
      errors: [{ code: "EMPTY", message: "ニュースデータが空です" }],
      warnings: [],
      acceptedItems: [],
      rejectedCount: 0,
      version: NEWS_PROVIDER_VALIDATOR_VERSION,
    };
  }

  for (const raw of items) {
    const itemErrors = [];
    const itemWarnings = [];

    const title = String(raw.title || "").trim();
    if (!title) {
      itemErrors.push({ code: "REQUIRED", message: "タイトル必須欠損" });
    }

    const publishedAt = raw.publishedAt || null;
    if (!publishedAt) {
      itemErrors.push({ code: "REQUIRED", message: "公開日時必須欠損" });
    } else if (Number.isNaN(Date.parse(publishedAt))) {
      itemErrors.push({ code: "TYPE", message: "公開日時型異常" });
    }

    const category = String(raw.category || "").trim();
    if (!category) {
      itemErrors.push({ code: "REQUIRED", message: "カテゴリ必須欠損" });
    } else if (!NEWS_CATEGORY_SET.has(category)) {
      itemErrors.push({
        code: "CATEGORY",
        message: `カテゴリ不正: ${category}`,
      });
    }

    const id = String(raw.id || "").trim();
    if (!id) {
      itemErrors.push({ code: "REQUIRED", message: "ID必須欠損" });
    } else if (seenIds.has(id)) {
      itemErrors.push({ code: "DUP", message: `ID重複: ${id}` });
    }

    const dupKey = `${title}|${publishedAt}|${category}`;
    if (title && publishedAt && category && seenKeys.has(dupKey)) {
      itemErrors.push({ code: "DUP", message: `記事重複: ${title}` });
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
      rejected.push({ id, title, errors: itemErrors });
      continue;
    }

    seenIds.add(id);
    seenKeys.add(dupKey);
    warnings.push(...itemWarnings.map((w) => ({ ...w, id })));

    acceptedItems.push({
      id,
      title,
      publishedAt,
      updatedAt: raw.updatedAt || publishedAt,
      raceNumber:
        raw.raceNumber != null && Number.isFinite(Number(raw.raceNumber))
          ? Number(raw.raceNumber)
          : null,
      venueId: raw.venueId || null,
      horses: Array.isArray(raw.horses) ? raw.horses : [],
      jockeys: Array.isArray(raw.jockeys) ? raw.jockeys : [],
      trainers: Array.isArray(raw.trainers) ? raw.trainers : [],
      category,
      categoryLabel: raw.categoryLabel || category,
      source: raw.source || "unknown",
      updateCount: Math.max(1, Number(raw.updateCount) || 1),
      importanceHint: raw.importanceHint || null,
      providerName: raw.providerName || extracted.meta?.providerName || "Real News",
    });
  }

  return {
    ok: errors.length === 0 && acceptedItems.length > 0,
    errors,
    warnings,
    acceptedItems,
    rejectedCount: rejected.length,
    rejected,
    version: NEWS_PROVIDER_VALIDATOR_VERSION,
  };
}

export const NewsValidator = {
  validate: validateRealNews,
  version: NEWS_PROVIDER_VALIDATOR_VERSION,
};
