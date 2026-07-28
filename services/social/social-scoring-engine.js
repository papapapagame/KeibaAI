/* ========================================
   Social Scoring Engine — Ver8.1
   ======================================== */

import { SOCIAL_CATEGORY } from "./social-categories.js";

const CATEGORY_WEIGHT = {
  [SOCIAL_CATEGORY.SCRATCH]: 1.0,
  [SOCIAL_CATEGORY.TRAINING]: 0.85,
  [SOCIAL_CATEGORY.JOCKEY]: 0.8,
  [SOCIAL_CATEGORY.PADDOCK]: 0.75,
  [SOCIAL_CATEGORY.BODY]: 0.7,
  [SOCIAL_CATEGORY.POPULARITY]: 0.65,
  [SOCIAL_CATEGORY.MEETING]: 0.4,
  [SOCIAL_CATEGORY.OTHER]: 0.3,
};

/**
 * Per-topic importance / freshness / reliability (0–100)
 * Does NOT use post body — metadata + counts only.
 */
export function scoreSocialItem(item = {}, now = Date.now()) {
  const postCount = Math.max(0, Number(item.postCount) || 0);
  const prev =
    item.prevPostCount != null ? Math.max(0, Number(item.prevPostCount)) : null;
  const catW = CATEGORY_WEIGHT[item.category] ?? 0.3;

  const freshness = freshnessScore(item.publishedAt || item.updatedAt, now);
  const volume = Math.min(100, Math.round(Math.log10(postCount + 1) * 40));
  const spike =
    prev != null && prev > 0
      ? Math.min(100, Math.round(((postCount - prev) / Math.max(prev, 1)) * 50))
      : volume * 0.4;
  const hintBoost =
    item.importanceHint === "critical"
      ? 25
      : item.importanceHint === "high"
        ? 15
        : item.importanceHint === "medium"
          ? 5
          : 0;

  const importance = clamp(
    Math.round(catW * 55 + volume * 0.25 + Math.max(0, spike) * 0.2 + hintBoost)
  );
  const reliability = clamp(
    Math.round(
      40 +
        (item.source && item.source !== "unknown" ? 20 : 0) +
        (postCount >= 50 ? 20 : postCount >= 20 ? 10 : 0) +
        (item.horses?.length || item.jockeys?.length ? 10 : 0) -
        (item.category === SOCIAL_CATEGORY.OTHER ? 15 : 0)
    )
  );

  return {
    importance,
    freshness,
    reliability,
    volume,
    spike: clamp(Math.round(Math.max(0, spike))),
  };
}

export function scoreSocialItems(items = [], now = Date.now()) {
  return (items || []).map((item) => ({
    ...item,
    scores: scoreSocialItem(item, now),
  }));
}

function freshnessScore(iso, now) {
  if (!iso) return 30;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 30;
  const hours = (now - t) / 3600000;
  if (hours <= 3) return 100;
  if (hours <= 12) return 85;
  if (hours <= 24) return 70;
  if (hours <= 48) return 50;
  if (hours <= 72) return 35;
  return 20;
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export const SocialScoringEngine = {
  scoreItem: scoreSocialItem,
  scoreItems: scoreSocialItems,
};
