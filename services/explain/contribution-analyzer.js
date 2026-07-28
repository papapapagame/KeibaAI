/* ========================================
   Contribution Analyzer — Ver8.3
   寄与率合計 100%（Discussion 採用 Evidence を基に配分）
   ======================================== */

import {
  ALL_FACTORS,
  CONTRIBUTION_FACTOR,
  CONTRIBUTION_FACTOR_LABEL,
  SOURCE_TO_FACTOR,
  CLAIM_TO_FACTOR,
} from "./contribution-factors.js";

/**
 * Build contribution % from adopted evidence weights.
 * Uses largest-remainder method so total === 100 exactly.
 */
export function analyzeContributions(discussion = null, context = {}) {
  const adopted = discussion?.reasoning?.adopted || [];
  const stage = Number(context.stage) || 0;
  const raw = Object.fromEntries(ALL_FACTORS.map((f) => [f, 0]));

  for (const e of adopted) {
    const factor =
      CLAIM_TO_FACTOR[e.claimType] ||
      SOURCE_TO_FACTOR[e.source] ||
      CONTRIBUTION_FACTOR.ABILITY;
    const w =
      (Number(e.scores?.confidence) || 40) * 0.4 +
      (Number(e.scores?.importance) || 40) * 0.35 +
      (Number(e.scores?.reliability) || 40) * 0.25;
    raw[factor] = (raw[factor] || 0) + Math.max(1, w);
  }

  if (stage >= 4) {
    raw[CONTRIBUTION_FACTOR.FRAME] += 8;
    raw[CONTRIBUTION_FACTOR.JOCKEY] += 8;
    raw[CONTRIBUTION_FACTOR.WEIGHT] += 4;
  } else if (stage >= 3) {
    raw[CONTRIBUTION_FACTOR.FRAME] += 4;
    raw[CONTRIBUTION_FACTOR.JOCKEY] += 4;
  }
  if (stage >= 5) {
    raw[CONTRIBUTION_FACTOR.ODDS] += 6;
    raw[CONTRIBUTION_FACTOR.MARKET] += 4;
  }
  if (context.hasWeather) raw[CONTRIBUTION_FACTOR.WEATHER] += 5;
  if (context.hasNews) raw[CONTRIBUTION_FACTOR.NEWS] += 4;
  if (context.hasSocial) raw[CONTRIBUTION_FACTOR.SOCIAL] += 3;
  if (context.hasLearning) raw[CONTRIBUTION_FACTOR.LEARNING] += 3;

  // Keep all factors in the model with a baseline so each appears
  for (const f of ALL_FACTORS) {
    if (raw[f] <= 0) raw[f] = 0.5;
  }

  const percents = largestRemainderPercents(ALL_FACTORS.map((f) => raw[f]));
  const byFactor = {};
  ALL_FACTORS.forEach((f, i) => {
    byFactor[f] = percents[i];
  });

  const items = ALL_FACTORS.map((factor, i) => ({
    factor,
    label: CONTRIBUTION_FACTOR_LABEL[factor],
    percent: percents[i],
    weightRaw: Math.round(raw[factor]),
  })).sort((a, b) => b.percent - a.percent);

  const totalPercent = items.reduce((s, i) => s + i.percent, 0);

  return {
    items,
    totalPercent,
    topFactors: items.filter((i) => i.percent > 0).slice(0, 5),
    byFactor,
  };
}

/** Hamilton / largest remainder — guarantees sum === 100 */
function largestRemainderPercents(weights = []) {
  const n = weights.length;
  if (!n) return [];
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const exact = weights.map((w) => (w / total) * 100);
  const floors = exact.map((v) => Math.floor(v));
  let rem = 100 - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  for (let k = 0; k < rem; k += 1) {
    out[order[k % order.length].i] += 1;
  }
  return out;
}

export const ContributionAnalyzer = { analyze: analyzeContributions };
