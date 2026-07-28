/* ========================================
   Trend Analyzer — Ver8.1
   Trend / Attention / Momentum / Confidence
   ======================================== */

import { SOCIAL_CATEGORY, SOCIAL_CATEGORY_LABEL } from "./social-categories.js";
import { scoreSocialItems } from "./social-scoring-engine.js";

/**
 * Build race-level and horse-level trend structure for AI.
 * Input: validated + normalized items (metadata only).
 */
export function analyzeTrends(items = [], options = {}) {
  const now = options.now || Date.now();
  const scored = scoreSocialItems(items, now);

  const byCategory = {};
  for (const key of Object.values(SOCIAL_CATEGORY)) {
    byCategory[key] = {
      category: key,
      label: SOCIAL_CATEGORY_LABEL[key],
      count: 0,
      postCount: 0,
      prevPostCount: 0,
    };
  }

  const byHorse = new Map();
  let totalPosts = 0;
  let totalPrev = 0;

  for (const item of scored) {
    const cat = byCategory[item.category] || byCategory[SOCIAL_CATEGORY.OTHER];
    cat.count += 1;
    cat.postCount += item.postCount || 0;
    cat.prevPostCount += item.prevPostCount || 0;
    totalPosts += item.postCount || 0;
    totalPrev += item.prevPostCount || 0;

    for (const horse of item.horses || []) {
      const name = String(horse);
      if (!byHorse.has(name)) {
        byHorse.set(name, {
          horse: name,
          categories: {},
          postCount: 0,
          prevPostCount: 0,
          topicCount: 0,
          maxImportance: 0,
          maxFreshness: 0,
          reliabilitySum: 0,
          reliabilityN: 0,
          items: [],
        });
      }
      const h = byHorse.get(name);
      h.postCount += item.postCount || 0;
      h.prevPostCount += item.prevPostCount || 0;
      h.topicCount += 1;
      h.maxImportance = Math.max(h.maxImportance, item.scores?.importance || 0);
      h.maxFreshness = Math.max(h.maxFreshness, item.scores?.freshness || 0);
      h.reliabilitySum += item.scores?.reliability || 0;
      h.reliabilityN += 1;
      h.categories[item.category] = (h.categories[item.category] || 0) + 1;
      h.items.push({
        id: item.id,
        category: item.category,
        categoryLabel: item.categoryLabel,
        importance: item.scores?.importance || 0,
        freshness: item.scores?.freshness || 0,
        reliability: item.scores?.reliability || 0,
        postCount: item.postCount || 0,
        trendChange: trendChangePct(item.postCount, item.prevPostCount),
      });
    }
  }

  const horseTrends = [...byHorse.values()].map((h) => {
    const attention = clamp(
      Math.round(
        Math.min(100, Math.log10(h.postCount + 1) * 35) * 0.5 +
          h.maxImportance * 0.35 +
          h.maxFreshness * 0.15
      )
    );
    const momentum = momentumScore(h.postCount, h.prevPostCount);
    const confidence = clamp(
      Math.round(
        (h.reliabilityN ? h.reliabilitySum / h.reliabilityN : 40) * 0.6 +
          Math.min(40, h.topicCount * 12)
      )
    );
    const trend = clamp(
      Math.round(attention * 0.4 + momentum * 0.35 + confidence * 0.25)
    );

    return {
      horse: h.horse,
      topicCount: h.topicCount,
      postCount: h.postCount,
      prevPostCount: h.prevPostCount,
      trendChange: trendChangePct(h.postCount, h.prevPostCount),
      categories: h.categories,
      topCategory: topCategory(h.categories),
      scores: {
        trend,
        attention,
        momentum,
        confidence,
      },
      topics: h.items.slice(0, 8),
    };
  });

  horseTrends.sort(
    (a, b) => (b.scores?.trend || 0) - (a.scores?.trend || 0)
  );

  const categoryList = Object.values(byCategory)
    .filter((c) => c.count > 0)
    .map((c) => ({
      ...c,
      trendChange: trendChangePct(c.postCount, c.prevPostCount),
      attention: clamp(
        Math.round(Math.min(100, Math.log10(c.postCount + 1) * 40) + c.count * 5)
      ),
    }))
    .sort((a, b) => b.attention - a.attention);

  const raceMomentum = momentumScore(totalPosts, totalPrev);
  const raceAttention = clamp(
    Math.round(
      Math.min(100, Math.log10(totalPosts + 1) * 38) +
        scored.length * 4 +
        (categoryList[0]?.attention || 0) * 0.15
    )
  );
  const raceConfidence = clamp(
    Math.round(
      scored.reduce((s, i) => s + (i.scores?.reliability || 0), 0) /
        Math.max(scored.length, 1)
    )
  );
  const raceTrend = clamp(
    Math.round(raceAttention * 0.4 + raceMomentum * 0.35 + raceConfidence * 0.25)
  );

  const importantTopics = scored
    .filter(
      (i) =>
        (i.scores?.importance || 0) >= 70 ||
        i.category === SOCIAL_CATEGORY.SCRATCH ||
        i.importanceHint === "critical"
    )
    .map((i) => ({
      id: i.id,
      category: i.category,
      categoryLabel: i.categoryLabel,
      horses: i.horses || [],
      importance: i.scores?.importance || 0,
      freshness: i.scores?.freshness || 0,
      postCount: i.postCount || 0,
      trendChange: trendChangePct(i.postCount, i.prevPostCount),
      reliability: i.scores?.reliability || 0,
    }));

  return {
    itemCount: scored.length,
    totalPosts,
    prevTotalPosts: totalPrev,
    trendChange: trendChangePct(totalPosts, totalPrev),
    scores: {
      trend: raceTrend,
      attention: raceAttention,
      momentum: raceMomentum,
      confidence: raceConfidence,
    },
    categories: categoryList,
    topCategories: categoryList.slice(0, 3).map((c) => c.label),
    horses: horseTrends,
    importantTopics,
    items: scored.map((i) => ({
      id: i.id,
      category: i.category,
      categoryLabel: i.categoryLabel,
      horses: i.horses || [],
      jockeys: i.jockeys || [],
      trainers: i.trainers || [],
      postType: i.postType,
      source: i.source,
      publishedAt: i.publishedAt,
      updatedAt: i.updatedAt,
      postCount: i.postCount || 0,
      prevPostCount: i.prevPostCount,
      trendChange: trendChangePct(i.postCount, i.prevPostCount),
      importance: i.scores?.importance || 0,
      freshness: i.scores?.freshness || 0,
      reliability: i.scores?.reliability || 0,
      // no body / text / media
    })),
  };
}

function topCategory(cats = {}) {
  let best = null;
  let n = -1;
  for (const [k, v] of Object.entries(cats)) {
    if (v > n) {
      n = v;
      best = k;
    }
  }
  return best
    ? { category: best, label: SOCIAL_CATEGORY_LABEL[best] || best, count: n }
    : null;
}

function trendChangePct(curr, prev) {
  const c = Number(curr) || 0;
  if (prev == null) return null;
  const p = Number(prev) || 0;
  if (p <= 0) return c > 0 ? 100 : 0;
  return Math.round(((c - p) / p) * 100);
}

function momentumScore(curr, prev) {
  const change = trendChangePct(curr, prev);
  if (change == null) {
    return clamp(Math.round(Math.min(80, Math.log10((curr || 0) + 1) * 30)));
  }
  // map -50%..+200% roughly to 0..100
  return clamp(Math.round(50 + change * 0.25));
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export const TrendAnalyzer = { analyze: analyzeTrends };
