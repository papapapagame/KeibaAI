/* ========================================
   Odds Completeness / Formatter / Merge — Ver7.8
   ======================================== */

export function computeOddsCompleteness(items = []) {
  const list = items || [];
  const n = list.length || 1;
  const rate = (pred) =>
    list.length ? Math.round((list.filter(pred).length / n) * 100) : 0;

  const odds = rate((o) => Number.isFinite(Number(o.winOdds)));
  const popularity = rate((o) => Number.isFinite(Number(o.popularity)));
  const market = rate(
    (o) =>
      o.marketIndex != null ||
      o.marketScore != null ||
      o.valueScore != null
  );
  const news = 0;
  const sns = 0;
  const scored = [odds, popularity, market, news, sns];
  const overall = Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);

  return {
    odds,
    popularity,
    market,
    news,
    sns,
    overall,
    note:
      news === 0 && sns === 0
        ? "ニュース・SNSは未取得（オッズ・市場のみ）"
        : "Odds 情報充足",
  };
}

export function confidenceFromOddsCompleteness(baseConfidence, completeness) {
  const base = Number(baseConfidence);
  const overall = Number(completeness?.overall);
  if (!Number.isFinite(base) || !Number.isFinite(overall)) return base || null;
  return Math.max(5, Math.min(99, Math.round(base * 0.45 + overall * 0.55)));
}

export function formatOddsStagePanel(stage = 0, completeness = null) {
  const s = Number(stage) || 0;
  return {
    stage: s,
    stageLabel: `Stage${s}`,
    title: "現在分析段階",
    mode: s >= 7 ? "当日最終分析（最新オッズ）" : s >= 6 ? "前日情報（オッズ反映）" : "オッズ待機",
    acquired:
      s >= 6
        ? ["人気", "オッズ", "市場情報"]
        : ["枠順", "騎手", "斤量"],
    pending:
      s >= 6
        ? ["ニュース", "SNS", "直前情報"]
        : ["オッズ", "人気", "市場情報"],
    provisional: s < 7,
    provisionalText:
      s >= 7
        ? "最新オッズを反映した分析です。"
        : s >= 6
          ? "前日オッズを反映した分析です。"
          : "オッズ未反映の暫定分析です。",
    completeness,
  };
}

/**
 * Stage6+: 確定オッズのみマージ。未確定は推測しない。
 */
export function mergeOddsOntoHorses(horses = [], oddsItems = [], stage = 0) {
  const s = Number(stage) || 0;
  if (s < 6) return horses || [];

  const map = new Map((oddsItems || []).map((o) => [Number(o.number), o]));
  return (horses || []).map((h) => {
    const o = map.get(Number(h.number));
    if (!o || !o.oddsConfirmed) return { ...h, _oddsUnconfirmed: true };

    return {
      ...h,
      odds: o.winOdds,
      placeOdds: o.placeOdds,
      popularity: o.popularity,
      marketIndex: o.marketIndex,
      marketScore: o.marketScore,
      supportScore: o.supportScore,
      valueScore: o.valueScore,
      marketLabel: o.marketLabel,
      oddsTrend: o.oddsTrend,
      expectedValueHint: o.expectedValueHint,
      oddsUpdatedAt: o.updatedAt,
      oddsHistory: o.history || [],
      _oddsUnconfirmed: false,
      oddsConfirmed: true,
      _oddsProvisional: s === 6,
      _marketAuxiliary: true,
      favorite: Number(o.popularity) <= 3,
    };
  });
}

/**
 * 表示スコアへ市場を補助反映（人気順依存にしない）
 * ValueScore を軽く加点、過剰人気は抑制
 */
export function applyOddsMarketAdjustments(ranked = [], stage = 0) {
  const s = Number(stage) || 0;
  if (s < 6) return ranked;

  return (ranked || []).map((h) => {
    if (!h.oddsConfirmed && h._oddsUnconfirmed !== false) return h;
    const value = Number(h.valueScore);
    const label = h.marketLabel || "";
    let delta = 0;
    if (Number.isFinite(value)) {
      if (value >= 65) delta += 2;
      else if (value <= 35) delta -= 1;
    }
    if (label === "過剰人気") delta -= 2;
    if (label === "過小評価") delta += 2;
    if (label === "期待値あり") delta += 1;
    if (!delta) {
      return {
        ...h,
        marketNote: label || null,
      };
    }
    const next = { ...h, marketNote: label || null };
    if (next.thinking && typeof next.thinking.score === "number") {
      next.thinking = {
        ...next.thinking,
        score: Math.max(0, Math.min(100, next.thinking.score + delta)),
        marketAux: { delta, label },
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

export const OddsCompleteness = {
  compute: computeOddsCompleteness,
  blendConfidence: confidenceFromOddsCompleteness,
};

export const OddsFormatter = {
  stagePanel: formatOddsStagePanel,
};

export const OddsMerge = {
  merge: mergeOddsOntoHorses,
  applyScores: applyOddsMarketAdjustments,
};
