/* ========================================
   News Merge / Completeness / Formatter
   Ver8.0 — 本文なし
   ======================================== */

/**
 * AI / Intelligence へ渡す構造化配列（本文なし）
 */
export function toAiNewsPayload(items = []) {
  return (items || []).map((n) => ({
    id: n.id,
    title: n.title,
    category: n.category,
    categoryLabel: n.categoryLabel,
    horses: n.horses || [],
    jockeys: n.jockeys || [],
    trainers: n.trainers || [],
    importance: n.importanceScore,
    freshness: n.freshnessScore,
    reliability: n.reliabilityScore,
    coverage: n.coverageScore,
    updateCount: n.updateCount,
    source: n.source,
    publishedAt: n.publishedAt,
    // body は絶対に含めない
  }));
}

/**
 * 馬へニュース補助メタを付与（本文なし）
 */
export function mergeNewsOntoHorses(horses = [], newsItems = []) {
  const byHorse = new Map();
  for (const n of newsItems || []) {
    for (const name of n.horses || []) {
      const key = String(name);
      if (!byHorse.has(key)) byHorse.set(key, []);
      byHorse.get(key).push(n);
    }
  }

  return (horses || []).map((h) => {
    const name = h.horse || h.horseName || "";
    const related = byHorse.get(String(name)) || [];
    if (!related.length) {
      return { ...h, newsMeta: null };
    }
    const top = [...related].sort(
      (a, b) => (b.importanceScore || 0) - (a.importanceScore || 0)
    )[0];
    return {
      ...h,
      newsMeta: {
        count: related.length,
        topCategory: top.category,
        topImportance: top.importanceScore,
        topFreshness: top.freshnessScore,
        topReliability: top.reliabilityScore,
        labels: related.map((r) => r.categoryLabel).slice(0, 3),
      },
      _newsAuxiliary: true,
    };
  });
}

/**
 * 表示スコアへ軽い補助（人気順依存にせず、取消・騎手を優先）
 */
export function applyNewsScoreAdjustments(ranked = [], newsItems = []) {
  if (!newsItems?.length) return ranked;
  const scratchNames = new Set(
    newsItems
      .filter((n) => n.category === "scratch")
      .flatMap((n) => n.horses || [])
  );
  const jockeyBoost = new Set(
    newsItems
      .filter((n) => n.category === "jockey" && (n.importanceScore || 0) >= 70)
      .flatMap((n) => n.horses || [])
  );
  const trainBoost = new Set(
    newsItems
      .filter((n) => n.category === "training" && (n.importanceScore || 0) >= 70)
      .flatMap((n) => n.horses || [])
  );

  return (ranked || []).map((h) => {
    const name = h.horse || h.horseName || "";
    let delta = 0;
    if (scratchNames.has(name)) delta -= 3;
    if (jockeyBoost.has(name)) delta += 1;
    if (trainBoost.has(name)) delta += 1;
    delta = Math.max(-2, Math.min(2, delta)); // 統合・単独化防止
    if (!delta) return h;
    const next = { ...h };
    if (next.thinking && typeof next.thinking.score === "number") {
      next.thinking = {
        ...next.thinking,
        score: Math.max(0, Math.min(100, next.thinking.score + delta)),
        newsAux: { delta },
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

export function computeNewsCompleteness(items = [], aggregate = {}) {
  const list = items || [];
  const n = list.length;
  const newsPct = n > 0 ? 100 : 0;
  const coverage = Number(aggregate.coverage) || 0;
  const reliability = Number(aggregate.reliability) || 0;
  const snsRaw = Number(aggregate.sns);
  const snsPct = Number.isFinite(snsRaw)
    ? Math.max(0, Math.min(100, snsRaw))
    : 0;
  const postRace = 0;
  const scored = [newsPct, coverage, reliability, snsPct, postRace];
  const overall = Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
  return {
    news: newsPct,
    coverage,
    reliability,
    sns: snsPct,
    postRace,
    overall,
    note: "記事本文は未取得。SNSはVer8.1構造化メタのみ（本文非転載）",
  };
}

export function confidenceFromNewsCompleteness(baseConfidence, completeness) {
  const base = Number(baseConfidence);
  const overall = Number(completeness?.overall);
  if (!Number.isFinite(base) || !Number.isFinite(overall)) return base || null;
  return Math.max(5, Math.min(99, Math.round(base * 0.55 + overall * 0.45)));
}

export function formatNewsStagePanel(stats = {}, completeness = null) {
  return {
    title: "News Intelligence",
    acquired: ["ニュースメタデータ", "カテゴリ", "重要度", "鮮度"],
    pending: ["記事本文", "レース後レビュー"],
    provisionalText: "ニュースは構造化メタデータのみ反映（本文非表示）。",
    stats,
    completeness,
  };
}

export const NewsMerge = {
  toAi: toAiNewsPayload,
  mergeHorses: mergeNewsOntoHorses,
  applyScores: applyNewsScoreAdjustments,
};

export const NewsCompleteness = {
  compute: computeNewsCompleteness,
  blendConfidence: confidenceFromNewsCompleteness,
};

export const NewsFormatter = {
  stagePanel: formatNewsStagePanel,
};
