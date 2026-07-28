/* ========================================
   Betting Intelligence Engine — Ver6.0
   既存 ai-engine / thinking-engine は変更しない
   ======================================== */

import { analyzeValue } from "./value-analyzer.js";
import { analyzeRisk } from "./risk-analyzer.js";
import { generateTickets } from "./ticket-generator.js";
import {
  buildStrategyVariants,
  optimizeCombinations,
} from "./combination-optimizer.js";
import {
  allocateBankroll,
  distributeToTickets,
  BUDGET_PRESETS,
} from "./bankroll-manager.js";
import { attachExplanations } from "./explain-betting.js";
import { clamp, horseName, toNum } from "./utils.js";

/**
 * @param {{
 *   race?: object,
 *   horses?: object[],
 *   analysisResult?: object,
 *   engineResult?: object,
 *   marketResult?: object,
 *   learningDash?: object,
 *   budget?: number,
 *   strategy?: string
 * }} input
 */
export function runBettingEngine(input = {}) {
  const race = input.race || {};
  const horses = enrichHorses(input.horses || [], input.analysisResult);
  const engineResult = input.engineResult || {};
  const marketResult = input.marketResult || {};
  const scores = {
    ...(engineResult.scores || {}),
    finalIqScore: marketResult.finalIq?.finalIqScore,
  };
  const marketScores = marketResult.scores || {};
  const learningDash = input.learningDash || null;
  const strategy = input.strategy || "バランス型";
  const budget = Number(input.budget) || 3000;

  const roles = resolveRoles(horses, input.analysisResult, engineResult, marketResult);
  const valueAnalysis = analyzeValue({ horses, scores, marketScores });
  const riskAnalysis = analyzeRisk({
    scores,
    marketScores,
    valueAnalysis,
    horses,
  });

  const learningHint =
    learningDash?.improvements?.[0] ||
    (learningDash?.performance?.hitRate >= 50
      ? "Learning AIの的中傾向を反映"
      : null);

  const ctx = {
    race,
    horses,
    scores,
    marketScores,
    valueAnalysis,
    riskAnalysis,
    strategy,
    learningHint,
  };

  const rawTickets = generateTickets(roles, { strategy });
  const optimized = optimizeCombinations(rawTickets, ctx);
  const explained = attachExplanations(optimized, ctx);
  const variants = buildStrategyVariants(rawTickets, ctx);
  for (const key of Object.keys(variants)) {
    variants[key] = attachExplanations(variants[key], {
      ...ctx,
      strategy: key,
    });
  }

  const bankroll = allocateBankroll(budget, {
    riskLevel: riskAnalysis.level,
  });
  const withStake = distributeToTickets(explained.slice(0, 8), bankroll);

  const byType = groupByType(withStake);
  const recommendedType = pickRecommendedType(withStake, riskAnalysis);

  const dashboard = {
    expectedRecovery: clamp(
      valueAnalysis.roiForecast * 0.85 +
        toNum(scores.valueScore, 55) * 0.2
    ),
    averageRisk: riskAnalysis.riskScore,
    riskLevel: riskAnalysis.level,
    expectedValue: valueAnalysis.raceExpectedValue,
    typeComparison: Object.keys(byType).map((type) => ({
      type,
      count: byType[type].length,
      avgEv: avg(byType[type].map((t) => t.expectedValue)),
      avgConfidence: avg(byType[type].map((t) => t.confidence)),
    })),
    recommendedType,
  };

  return {
    version: "6.0.0",
    engine: "Betting Intelligence AI",
    generatedAt: new Date().toISOString(),
    roles,
    valueAnalysis,
    riskAnalysis,
    tickets: withStake,
    variants: {
      AI案: withStake,
      安全型: variants["安全型"] || [],
      期待値型: variants["期待値型"] || [],
      穴狙い型: variants["穴狙い型"] || [],
      バランス型: variants["バランス型"] || [],
    },
    bankroll,
    budgetPresets: BUDGET_PRESETS,
    dashboard,
    modules: {
      BettingEngine: "ONLINE",
      TicketGenerator: "ONLINE",
      ValueAnalyzer: "ONLINE",
      RiskAnalyzer: riskAnalysis.level,
      BankrollManager: "ONLINE",
      CombinationOptimizer: "ONLINE",
    },
    policy: {
      usesPopularityOnly: false,
      integratesIqValueMarketLearning: true,
    },
  };
}

function enrichHorses(horses, analysisResult) {
  const reports = analysisResult?.horses || analysisResult?.horseReports || [];
  const byNum = new Map(reports.map((h) => [Number(h.number), h]));
  return (horses || []).map((h) => {
    const a = byNum.get(Number(h.number)) || {};
    return {
      ...h,
      thinking: a.thinking || h.thinking,
      indexes: a.indexes || h.indexes,
      iq:
        a.thinking?.score ||
        (a.indexes?.total != null ? a.indexes.total / 10 : null),
    };
  });
}

function resolveRoles(horses, analysisResult, engineResult, marketResult) {
  const ranked = [...horses].sort((a, b) => {
    const sa =
      toNum(a.iq, 0) ||
      toNum(a.thinking?.score, 0) ||
      toNum(a.indexes?.total, 0);
    const sb =
      toNum(b.iq, 0) ||
      toNum(b.thinking?.score, 0) ||
      toNum(b.indexes?.total, 0);
    return sb - sa;
  });

  const marks = analysisResult?.marks || {};
  const honmeiFromMark = findByMark(horses, marks, "◎");
  const taikouFromMark = findByMark(horses, marks, "○").concat(
    findByMark(horses, marks, "〇")
  );
  const anaFromMark = findByMark(horses, marks, "▲").concat(
    findByMark(horses, marks, "☆")
  );

  const upset =
    marketResult?.report?.upset?.number ||
    engineResult?.analyzers?.odds?.upsets?.[0]?.number;
  const danger =
    marketResult?.report?.danger?.number ||
    engineResult?.analyzers?.odds?.overbetList?.[0]?.number;

  const honmei = unique([
    honmeiFromMark[0],
    ranked[0]?.number,
  ].filter(Boolean));
  const taikou = unique([
    ...taikouFromMark,
    ranked[1]?.number,
    ranked[2]?.number,
  ].filter((n) => n && !honmei.includes(n)));
  const ana = unique([
    ...anaFromMark,
    upset,
    ...ranked.slice(3, 7).map((h) => h.number),
  ].filter((n) => n && !honmei.includes(n) && !taikou.includes(n)));

  return {
    honmei,
    taikou: taikou.slice(0, 3),
    ana: ana.slice(0, 4),
    danger: danger ? [danger] : [],
    labels: {
      honmei: honmei.map((n) => labelHorse(horses, n)),
      taikou: taikou.slice(0, 3).map((n) => labelHorse(horses, n)),
      ana: ana.slice(0, 4).map((n) => labelHorse(horses, n)),
      danger: danger ? [labelHorse(horses, danger)] : [],
    },
  };
}

function findByMark(horses, marks, symbol) {
  // marks may be map number->mark or array
  if (Array.isArray(marks)) {
    return marks.filter((m) => m.mark === symbol).map((m) => m.number);
  }
  const out = [];
  for (const h of horses || []) {
    const m = marks[h.number] || marks[String(h.number)] || h.mark;
    if (m === symbol) out.push(h.number);
  }
  return out;
}

function labelHorse(horses, number) {
  const h = (horses || []).find((x) => Number(x.number) === Number(number));
  return { number, name: horseName(h || { number }) };
}

function unique(list) {
  return [...new Set(list.map(Number).filter((n) => n > 0))];
}

function groupByType(tickets) {
  const map = {};
  for (const t of tickets) {
    if (!map[t.type]) map[t.type] = [];
    map[t.type].push(t);
  }
  return map;
}

function pickRecommendedType(tickets, risk) {
  if (!tickets.length) return "三連複";
  if (risk.level === "Very High" || risk.level === "High") return "ワイド";
  if (risk.level === "Very Low") return "複勝";
  return tickets[0].type || "三連複";
}

function avg(list) {
  if (!list.length) return 0;
  return Math.round(list.reduce((s, v) => s + Number(v || 0), 0) / list.length);
}
