/* ========================================
   Social Merge / Completeness / Formatter
   Ver8.1 — 投稿本文なし
   ======================================== */

/**
 * AI へ渡す構造化配列（本文・画像・動画なし）
 */
export function toAiSocialPayload(trends) {
  if (!trends) {
    return {
      available: false,
      itemCount: 0,
      categories: [],
      horses: [],
      scores: null,
      topics: [],
    };
  }

  return {
    available: true,
    itemCount: trends.itemCount || 0,
    totalPosts: trends.totalPosts || 0,
    trendChange: trends.trendChange,
    scores: trends.scores || null,
    topCategories: trends.topCategories || [],
    categories: (trends.categories || []).map((c) => ({
      category: c.category,
      label: c.label,
      count: c.count,
      postCount: c.postCount,
      trendChange: c.trendChange,
      attention: c.attention,
    })),
    horses: (trends.horses || []).map((h) => ({
      horse: h.horse,
      topicCount: h.topicCount,
      postCount: h.postCount,
      trendChange: h.trendChange,
      topCategory: h.topCategory,
      importance: Math.round(
        (h.scores?.attention || 0) * 0.5 + (h.scores?.trend || 0) * 0.5
      ),
      freshness: Math.max(
        0,
        ...(h.topics || []).map((t) => Number(t.freshness) || 0),
        0
      ),
      reliability: h.scores?.confidence || 0,
      scores: h.scores,
      topics: (h.topics || []).map((t) => ({
        category: t.category,
        categoryLabel: t.categoryLabel,
        importance: t.importance,
        freshness: t.freshness,
        reliability: t.reliability,
        postCount: t.postCount,
        trendChange: t.trendChange,
      })),
    })),
    topics: (trends.items || []).map((i) => ({
      id: i.id,
      category: i.category,
      categoryLabel: i.categoryLabel,
      horses: i.horses || [],
      importance: i.importance,
      freshness: i.freshness,
      reliability: i.reliability,
      postCount: i.postCount,
      trendChange: i.trendChange,
      source: i.source,
      publishedAt: i.publishedAt,
      updatedAt: i.updatedAt,
    })),
    importantTopics: trends.importantTopics || [],
  };
}

/**
 * 馬へ SNS 補助メタを付与（本文なし）
 */
export function mergeSocialOntoHorses(horses = [], trends = null) {
  const byHorse = new Map();
  for (const h of trends?.horses || []) {
    byHorse.set(String(h.horse), h);
  }

  return (horses || []).map((horse) => {
    const name = horse.horse || horse.horseName || "";
    const related = byHorse.get(String(name));
    if (!related) {
      return { ...horse, socialMeta: null };
    }
    return {
      ...horse,
      socialMeta: {
        topicCount: related.topicCount,
        postCount: related.postCount,
        trendChange: related.trendChange,
        topCategory: related.topCategory,
        scores: related.scores,
        importance: related.scores?.attention || 0,
        freshness: Math.max(
          0,
          ...(related.topics || []).map((t) => Number(t.freshness) || 0),
          0
        ),
        reliability: related.scores?.confidence || 0,
      },
      _socialAuxiliary: true,
    };
  });
}

/**
 * 表示スコアへ軽い補助（AIエンジン非改変）
 */
export function applySocialScoreAdjustments(ranked = [], trends = null) {
  if (!trends?.horses?.length && !trends?.items?.length) return ranked;

  const scratchNames = new Set(
    (trends.items || [])
      .filter((n) => n.category === "scratch")
      .flatMap((n) => n.horses || [])
  );
  const buzzBoost = new Set(
    (trends.horses || [])
      .filter((h) => (h.scores?.trend || 0) >= 72)
      .map((h) => h.horse)
  );
  const trainBoost = new Set(
    (trends.items || [])
      .filter(
        (n) => n.category === "training" && (n.importance || 0) >= 70
      )
      .flatMap((n) => n.horses || [])
  );

  return (ranked || []).map((h) => {
    const name = h.horse || h.horseName || "";
    let delta = 0;
    if (scratchNames.has(name)) delta -= 2;
    if (buzzBoost.has(name)) delta += 1;
    if (trainBoost.has(name)) delta += 1;
    delta = Math.max(-2, Math.min(2, delta));
    if (!delta) return h;
    const next = { ...h };
    if (next.thinking && typeof next.thinking.score === "number") {
      next.thinking = {
        ...next.thinking,
        score: Math.max(0, Math.min(100, next.thinking.score + delta)),
        socialAux: { delta },
      };
    }
    if (next.indexes && typeof next.indexes.total === "number") {
      next.indexes = {
        ...next.indexes,
        total: Math.max(0, Math.min(100, next.indexes.total + delta)),
      };
    }
    return next;
  });
}

export function computeSocialCompleteness(trends = null) {
  const n = trends?.itemCount || 0;
  const snsPct = n > 0 ? 100 : 0;
  const trend = Number(trends?.scores?.trend) || 0;
  const attention = Number(trends?.scores?.attention) || 0;
  const confidence = Number(trends?.scores?.confidence) || 0;
  const scored = [snsPct, trend, attention, confidence];
  const overall = Math.round(
    scored.reduce((a, b) => a + b, 0) / Math.max(scored.length, 1)
  );
  return {
    sns: snsPct,
    trend,
    attention,
    confidence,
    overall,
    note: "SNS投稿本文・画像・動画は未取得（構造化メタデータのみ）",
  };
}

export function confidenceFromSocialCompleteness(baseConfidence, completeness) {
  const base = Number(baseConfidence);
  const overall = Number(completeness?.overall);
  if (!Number.isFinite(base) || !Number.isFinite(overall)) return base || null;
  return Math.max(5, Math.min(99, Math.round(base * 0.6 + overall * 0.4)));
}

export function formatSocialStagePanel(stats = {}, completeness = null) {
  return {
    title: "Social Intelligence",
    acquired: ["SNSメタデータ", "カテゴリ", "トレンド", "注目度"],
    pending: ["投稿本文", "画像", "動画", "コメント"],
    provisionalText:
      "SNSは構造化メタデータ・独自スコアのみ反映（投稿本文非表示）。",
    stats,
    completeness,
  };
}

export const SocialMerge = {
  toAi: toAiSocialPayload,
  mergeHorses: mergeSocialOntoHorses,
  applyScores: applySocialScoreAdjustments,
};

export const SocialCompleteness = {
  compute: computeSocialCompleteness,
  blendConfidence: confidenceFromSocialCompleteness,
};

export const SocialFormatter = {
  stagePanel: formatSocialStagePanel,
};
