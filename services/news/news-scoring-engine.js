/* ========================================
   News Scoring Engine — Ver8.0
   Freshness / Importance / Reliability / Coverage
   ======================================== */

import { NEWS_CATEGORY } from "./news-categories.js";

/**
 * 構造化ニュースへスコア付与（本文不使用）
 */
export function scoreNewsItems(items = [], now = Date.now()) {
  const scored = (items || []).map((item) => scoreOne(item, now));
  const coverage = computeCoverageScore(scored);
  return {
    items: scored.map((s) => ({
      ...s,
      coverageScore: coverage,
    })),
    aggregate: {
      freshness: avg(scored.map((s) => s.freshnessScore)),
      importance: avg(scored.map((s) => s.importanceScore)),
      reliability: avg(scored.map((s) => s.reliabilityScore)),
      coverage,
      importantCount: scored.filter((s) => s.importanceScore >= 70).length,
      total: scored.length,
    },
  };
}

function scoreOne(item, now) {
  const freshnessScore = computeFreshness(item.publishedAt || item.updatedAt, now);
  const importanceScore = computeImportance(item);
  const reliabilityScore = computeReliability(item);
  return {
    ...item,
    freshnessScore,
    importanceScore,
    reliabilityScore,
    // AI向け構造化ペイロード（本文なし）
    aiPayload: {
      targetHorses: item.horses || [],
      targetJockeys: item.jockeys || [],
      targetTrainers: item.trainers || [],
      category: item.category,
      categoryLabel: item.categoryLabel,
      importance: importanceScore,
      freshness: freshnessScore,
      reliability: reliabilityScore,
      updateCount: item.updateCount || 1,
      source: item.source,
      publishedAt: item.publishedAt,
      title: item.title,
    },
  };
}

function computeFreshness(iso, now) {
  if (!iso || Number.isNaN(Date.parse(iso))) return 20;
  const ageH = Math.max(0, (now - Date.parse(iso)) / 3600000);
  if (ageH <= 6) return 98;
  if (ageH <= 24) return 88;
  if (ageH <= 48) return 72;
  if (ageH <= 72) return 55;
  if (ageH <= 168) return 40;
  return 22;
}

function computeImportance(item) {
  const catBoost = {
    [NEWS_CATEGORY.SCRATCH]: 92,
    [NEWS_CATEGORY.JOCKEY]: 78,
    [NEWS_CATEGORY.TRAINING]: 70,
    [NEWS_CATEGORY.TRACK]: 68,
    [NEWS_CATEGORY.ENTRY]: 62,
    [NEWS_CATEGORY.MEETING]: 50,
    [NEWS_CATEGORY.COMMENT]: 48,
    [NEWS_CATEGORY.OTHER]: 40,
  };
  let score = catBoost[item.category] ?? 45;
  const hint = String(item.importanceHint || "").toLowerCase();
  if (hint === "critical") score = Math.max(score, 95);
  if (hint === "high") score = Math.max(score, 80);
  if (hint === "medium") score = Math.max(score, 60);
  if (hint === "low") score = Math.min(score, 45);
  score += Math.min(8, (Number(item.updateCount) || 1) - 1) * 2;
  if ((item.horses || []).length >= 2) score += 4;
  return clamp(score, 0, 100);
}

function computeReliability(item) {
  const source = String(item.source || "").toLowerCase();
  let score = 55;
  if (source.includes("official")) score = 92;
  else if (source.includes("track")) score = 85;
  else if (source.includes("agency")) score = 72;
  else if (source.includes("press")) score = 65;
  else if (source.includes("desk")) score = 58;
  if ((Number(item.updateCount) || 1) >= 3) score += 4;
  return clamp(score, 0, 100);
}

function computeCoverageScore(items = []) {
  if (!items.length) return 0;
  const cats = new Set(items.map((i) => i.category));
  const horseHit = items.some((i) => (i.horses || []).length > 0);
  const base = Math.min(100, cats.size * 12 + items.length * 6);
  return clamp(base + (horseHit ? 10 : 0), 0, 100);
}

function avg(nums = []) {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export const NewsScoringEngine = {
  score: scoreNewsItems,
};
