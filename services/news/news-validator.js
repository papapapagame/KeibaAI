/* ========================================
   News Validator — Ver8.0
   ======================================== */

import { NEWS_CATEGORY_SET, normalizeNewsCategory } from "./news-categories.js";

/**
 * 重複・必須・型・カテゴリ・対象レース
 * 異常は AI へ渡さない。本文フィールドがあれば破棄。
 */
export function validateNewsItems(items = [], options = {}) {
  const errors = [];
  const warnings = [];
  const sanitized = [];
  const seenIds = new Set();
  const seenKeys = new Set();
  const expectRace =
    options.raceNumber != null ? Number(options.raceNumber) : null;

  for (const raw of items || []) {
    // 本文・画像・SNSを破棄
    const {
      body: _b,
      content: _c,
      text: _t,
      html: _h,
      image: _i,
      images: _is,
      sns: _s,
      ...safe
    } = raw || {};

    const title = String(safe.title || "").trim();
    const id = String(safe.id || "").trim();
    const category = normalizeNewsCategory(safe.category);
    const publishedAt = safe.publishedAt || null;
    const raceNumber =
      safe.raceNumber != null ? Number(safe.raceNumber) : null;

    if (!title) {
      errors.push({ code: "REQUIRED", message: "タイトル必須欠損" });
      continue;
    }
    if (!publishedAt || Number.isNaN(Date.parse(publishedAt))) {
      errors.push({
        code: "TYPE",
        message: `公開日時異常: ${title}`,
      });
      continue;
    }
    if (!NEWS_CATEGORY_SET.has(category)) {
      errors.push({
        code: "CATEGORY",
        message: `カテゴリ不正: ${safe.category}`,
      });
      continue;
    }
    if (expectRace != null && raceNumber != null && raceNumber !== expectRace) {
      warnings.push({
        code: "RACE",
        message: `対象レース不一致: ${title}`,
      });
      // 不一致は警告のみ（他レース横断ニュースを許容）
    }
    if (id && seenIds.has(id)) {
      errors.push({ code: "DUP", message: `記事ID重複: ${id}` });
      continue;
    }
    const dupKey = `${title}|${publishedAt}|${category}`;
    if (seenKeys.has(dupKey)) {
      errors.push({ code: "DUP", message: `重複記事: ${title}` });
      continue;
    }
    if (id) seenIds.add(id);
    seenKeys.add(dupKey);

    if (!safe.source) {
      warnings.push({ code: "MISSING", message: `ソース欠損: ${title}` });
    }

    sanitized.push({
      ...safe,
      id: id || `auto_${seenKeys.size}`,
      title,
      category,
      categoryLabel:
        safe.categoryLabel ||
        ({
          entry: "出走関連",
          training: "調教関連",
          comment: "コメント",
          scratch: "取消情報",
          jockey: "騎手情報",
          track: "馬場関連",
          meeting: "開催情報",
          other: "その他",
        }[category] || "その他"),
      publishedAt,
      raceNumber,
      horses: Array.isArray(safe.horses) ? safe.horses : [],
      jockeys: Array.isArray(safe.jockeys) ? safe.jockeys : [],
      trainers: Array.isArray(safe.trainers) ? safe.trainers : [],
      source: safe.source || "unknown",
      updatedAt: safe.updatedAt || publishedAt,
      updateCount: Math.max(1, Number(safe.updateCount) || 1),
    });
  }

  return {
    ok: errors.length === 0 && sanitized.length > 0,
    errors,
    warnings,
    sanitized,
  };
}

export const NewsValidator = { validate: validateNewsItems };
