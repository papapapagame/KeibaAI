/* ========================================
   RiskAnalyzer — Ver6.0
   ======================================== */

import { clamp, toNum } from "./utils.js";

const LEVELS = [
  { max: 20, label: "Very Low" },
  { max: 40, label: "Low" },
  { max: 60, label: "Medium" },
  { max: 80, label: "High" },
  { max: 101, label: "Very High" },
];

export function analyzeRisk(context = {}) {
  const scores = context.scores || {};
  const market = context.marketScores || {};
  const value = context.valueAnalysis || {};
  const horses = Array.isArray(context.horses) ? context.horses : [];

  const danger = toNum(scores.dangerScore ?? market.riskScore, 45);
  const overbetCount = (value.horses || []).filter((h) => h.overbet).length;
  const field = horses.length;
  const score = clamp(
    danger * 0.45 +
      overbetCount * 8 +
      (field > 14 ? 10 : 0) +
      (100 - toNum(scores.trustScore, 60)) * 0.25
  );

  const level = LEVELS.find((l) => score < l.max)?.label || "Medium";

  return {
    analyzer: "RiskAnalyzer",
    status: "ONLINE",
    riskScore: score,
    level,
    factors: {
      dangerScore: danger,
      overbetCount,
      fieldSize: field,
      trust: toNum(scores.trustScore, 60),
    },
  };
}

export function riskLevelFromScore(score) {
  const s = clamp(score);
  return LEVELS.find((l) => s < l.max)?.label || "Medium";
}
