/* ========================================
   WeightOptimizer — Ver5.5
   Analyzer 別重み管理（手動調整可）
   ※ AIロジック自動書換は禁止。Ver6.0 反映用の提案のみ。
   ======================================== */

import { LEARNING_WEIGHTS_KEY } from "./learning-db.js";

export const DEFAULT_ANALYZER_WEIGHTS = {
  HorseAnalyzer: 0.28,
  RaceAnalyzer: 0.12,
  OddsAnalyzer: 0.18,
  HistoryAnalyzer: 0.12,
  TrendAnalyzer: 0.1,
  MarketAnalyzer: 0.2,
  LearningEngine: 0.0, // Ver6.0 まで反映しない
};

export function loadWeights() {
  try {
    const raw = localStorage.getItem(LEARNING_WEIGHTS_KEY);
    if (!raw) return { ...DEFAULT_ANALYZER_WEIGHTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_ANALYZER_WEIGHTS, ...parsed };
  } catch {
    return { ...DEFAULT_ANALYZER_WEIGHTS };
  }
}

export function saveWeights(weights = {}) {
  const next = normalizeWeights({ ...DEFAULT_ANALYZER_WEIGHTS, ...weights });
  try {
    localStorage.setItem(LEARNING_WEIGHTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function resetWeights() {
  try {
    localStorage.removeItem(LEARNING_WEIGHTS_KEY);
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_ANALYZER_WEIGHTS };
}

/**
 * 精度に基づく「提案」重み（自動適用しない）
 */
export function proposeWeights(analyzerStats = [], current = null) {
  const base = current || loadWeights();
  const proposed = { ...base };
  const suggestions = [];

  for (const row of analyzerStats) {
    const key = row.name;
    if (!(key in proposed)) continue;
    const acc = Number(row.accuracy) || 50;
    const delta = ((acc - 70) / 100) * 0.08;
    const before = proposed[key];
    let after = Math.max(0.05, Math.min(0.4, before + delta));
    if (key === "LearningEngine") after = 0;
    proposed[key] = after;
    if (Math.abs(after - before) >= 0.01) {
      suggestions.push({
        analyzer: key,
        from: round4(before),
        to: round4(after),
        reason:
          acc >= 80
            ? "精度が高いため寄与をやや上げる提案"
            : acc < 60
              ? "精度が低いため寄与をやや下げる提案"
              : "微調整提案",
      });
    }
  }

  return {
    current: normalizeWeights(base),
    proposed: normalizeWeights(proposed),
    suggestions,
    autoApply: false,
    note: "Ver5.5 does not auto-apply weights. Safe for Ver6.0.",
  };
}

function normalizeWeights(weights) {
  const keys = Object.keys(DEFAULT_ANALYZER_WEIGHTS);
  const next = {};
  let sum = 0;
  for (const key of keys) {
    const v =
      key === "LearningEngine"
        ? 0
        : Math.max(0, Number(weights[key]) || 0);
    next[key] = v;
    sum += v;
  }
  if (sum <= 0) return { ...DEFAULT_ANALYZER_WEIGHTS };
  for (const key of keys) {
    if (key === "LearningEngine") {
      next[key] = 0;
      continue;
    }
    next[key] = round4(next[key] / sum);
  }
  return next;
}

function round4(n) {
  return Math.round(Number(n) * 10000) / 10000;
}
