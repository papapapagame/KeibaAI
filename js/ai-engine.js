/* ========================================
   PAPAPA IQ KEIBA - ai-engine.js
   Ver2.0.0 予想家思考AI
   思考評価 → 展開シミュ → 買い目3型 → 資金配分
   ローカル実装 / 将来 OpenAI・Gemini 差し替え可
   ======================================== */

import {
  AI_MODE,
  AI_NAME,
  AI_VERSION,
  DEBUG_MODE,
  DEFAULT_BET,
  INDEX_BASE,
  INDEX_GAP_CLOSE,
  INDEX_GAP_WIDE,
  MAX_TICKET,
  TICKET_BUDGETS,
  TICKET_STRATEGIES,
} from "./config.js";
import {
  averageIndexes,
  calcIndexDiff,
  calculateIndexes,
} from "./index-engine.js";
import {
  getLearningInsights,
  loadLearningState,
} from "./learning-engine.js";
import {
  analyzeThinkingField,
  simulatePace,
} from "./thinking-engine.js";

/**
 * レース分析エントリーポイント
 * 過去成績 → 補正更新 → 指数更新 → 予想
 * 将来: AI_MODE が openai / gemini のとき外部APIへ差し替え
 */
export async function analyzeRace({ race, horses, settings }) {
  const aiSettings = normalizeSettings(settings);
  const learningState = await loadLearningState();
  const corrections = learningState.corrections;

  if (DEBUG_MODE) {
    console.log(`[${AI_NAME}] v${AI_VERSION} mode=${AI_MODE}`, {
      aiSettings,
      learningMetrics: learningState.metrics,
    });
  }

  if (AI_MODE === "openai" || AI_MODE === "gemini") {
    // 将来: return await callExternalAiApi({ race, horses, aiSettings, learningState });
    if (DEBUG_MODE) {
      console.warn(`[${AI_NAME}] ${AI_MODE} 未接続のためローカルエンジンを使用`);
    }
  }

  return analyzeRaceLocal({
    race,
    horses,
    aiSettings,
    corrections,
    learningState,
  });
}

function analyzeRaceLocal({
  race,
  horses,
  aiSettings,
  corrections,
  learningState,
}) {
  // 展開シミュレーター（超ハイ〜超スロー）
  const paceSim = simulatePace(horses);
  const paceForecast = {
    ...predictPace(horses, race),
    ...paceSim,
    pace: paceSim.pace,
  };

  // 1) 指数生成
  const indexed = (horses || []).map((horse) => {
    const indexes = calculateIndexes(
      horse,
      race,
      aiSettings,
      paceForecast,
      corrections
    );
    return { horse, indexes };
  });

  const avgIndexes = averageIndexes(indexed.map((item) => item.indexes));

  // 2) スコア生成
  let scoredHorses = indexed.map(({ horse, indexes }) => {
    const diff = calcIndexDiff(indexes, avgIndexes);
    return calculateScore(horse, indexes, diff, race, aiSettings, paceForecast);
  });

  const finalAvg = averageIndexes(scoredHorses.map((h) => h.indexes));
  scoredHorses = scoredHorses.map((horse) => ({
    ...horse,
    indexDiff: calcIndexDiff(horse.indexes, finalAvg),
  }));

  // 3) AI思考エンジン（能力→…→オッズ）
  const thinking = analyzeThinkingField(scoredHorses, race, paceSim);
  scoredHorses = thinking.horses;

  const byThinking = thinking.byThinking;
  const byIndex = [...scoredHorses].sort(
    (a, b) =>
      (b.thinking?.score || 0) - (a.thinking?.score || 0) ||
      b.indexes.total - a.indexes.total
  );
  const byWinRate = [...scoredHorses].sort(
    (a, b) => b.winRate - a.winRate || b.indexes.total - a.indexes.total
  );
  const byEv = [...scoredHorses].sort(
    (a, b) =>
      b.indexes.expectedValue - a.indexes.expectedValue ||
      b.score.stars - a.score.stars ||
      b.indexes.total - a.indexes.total
  );

  const top = byThinking[0] || byIndex[0];
  const overall = buildOverall(scoredHorses, top, aiSettings, paceForecast, finalAvg);
  const dangerHorse = thinking.dangerHorse || pickDangerHorse(scoredHorses);
  const upsetHorse =
    thinking.upsetHorse || pickUpsetHorse(scoredHorses, dangerHorse);
  const paceLanes = buildPaceLanes(scoredHorses);
  const radar = buildRadar(scoredHorses, overall);
  const indexGap = calcTopIndexGap(byIndex);
  const ticketBias = resolveTicketBias(indexGap);
  const learningInsight = getLearningInsights(race, learningState);

  const aiComment = createComment({
    top,
    upsetHorse,
    dangerHorse,
    overall,
    race,
    aiSettings,
    paceForecast,
    scoredHorses,
    avgIndexes: finalAvg,
    indexGap,
    ticketBias,
    learningInsight,
    learningMetrics: learningState?.metrics,
  });

  // 思考コメント追記
  aiComment.unshift(
    `展開シミュ: ${paceSim.pace}（${paceSim.advantage}）`,
    `思考評価1位: ${top?.horse || "-"}（${top?.thinking?.score ?? "-"}点）`
  );

  const tickets = recommendTickets(
    scoredHorses,
    aiSettings,
    paceForecast,
    ticketBias,
    indexGap
  );

  const horseReports = buildHorseReports({
    scoredHorses: byThinking,
    race,
    paceForecast,
    avgIndexes: finalAvg,
    dangerHorse,
    upsetHorse,
    learningInsight,
  });

  // レポートへ思考・妙味ラベル反映
  const reportMap = new Map(
    horseReports.map((r) => {
      const src = scoredHorses.find((h) => h.number === r.number);
      if (src?.thinking) {
        r.thinking = src.thinking;
        r.oddsLabel = src.thinking.oddsLabel;
        if (src.thinking.oddsLabel === "危険人気") r.role = "危険人気馬";
        if (src.thinking.oddsLabel === "妙味あり" && r.role !== "本命向き") {
          r.role = "穴候補";
        }
      }
      return [r.number, r];
    })
  );

  scoredHorses = scoredHorses.map((horse) => ({
    ...horse,
    report: reportMap.get(horse.number) || null,
  }));

  const indexRanking = byThinking.slice(0, 5).map((entry) => ({
    ...entry,
    index: entry.indexes.total,
    avgDiff: entry.indexDiff.total,
    role: reportMap.get(entry.number)?.role || "",
    thinkingScore: entry.thinking?.score,
  }));

  const avgDiffRanking = [...scoredHorses]
    .sort((a, b) => b.indexDiff.total - a.indexDiff.total)
    .slice(0, 5)
    .map((entry) => ({
      ...entry,
      index: entry.indexes.total,
      avgDiff: entry.indexDiff.total,
    }));

  const dangerReport = reportMap.get(
    scoredHorses.find((h) => h.horse === dangerHorse.horse)?.number
  );
  const upsetReport = reportMap.get(
    scoredHorses.find((h) => h.horse === upsetHorse.horse)?.number
  );
  if (dangerReport) {
    dangerHorse.reason = dangerReport.roleComment || dangerHorse.reason;
    dangerHorse.grade = dangerReport.grade || dangerHorse.grade;
  }
  if (upsetReport) {
    upsetHorse.reason = upsetReport.roleComment || upsetHorse.reason;
    upsetHorse.grade = upsetReport.grade || upsetHorse.grade;
  }

  const paceScenario = buildPaceScenario(paceForecast, paceLanes, byThinking);
  const finalComment = buildFinalComment(horseReports, dangerHorse, upsetHorse);

  return {
    overall,
    horses: scoredHorses,
    horseReports,
    thinking: {
      paceSim,
      weights: thinking.weights,
      dangerList: thinking.dangerList?.map((h) => h.horse) || [],
      upsetList: thinking.upsetList?.map((h) => h.horse) || [],
    },
    paceScenario,
    finalComment,
    winRateRanking: byWinRate.slice(0, 5),
    evRanking: byEv.slice(0, 5),
    indexRanking,
    avgDiffRanking,
    avgIndexes: finalAvg,
    indexGap,
    ticketBias,
    dangerHorse,
    upsetHorse,
    paceLanes,
    paceForecast,
    radar,
    aiComment,
    tickets,
    learning: {
      metrics: learningState?.metrics || null,
      corrections,
      insight: learningInsight,
    },
    confidence: overall.confidence,
    expectedReturn: overall.expectedReturn,
    risk: overall.risk,
    meta: {
      aiName: AI_NAME,
      aiVersion: AI_VERSION,
      mode: AI_MODE,
      racesLearned: learningState?.metrics?.racesLearned || 0,
    },
  };
}

/**
 * 展開予測: 逃げ/先行/差し/追込の頭数からペース判定
 */
export function predictPace(horses = [], race = {}) {
  const counts = { 逃げ: 0, 先行: 0, 差し: 0, 追込: 0 };
  horses.forEach((horse) => {
    const style = horse.runningStyle || "差し";
    if (counts[style] != null) counts[style] += 1;
  });

  const front = counts.逃げ + counts.先行 * 0.5;
  let pace = "平均";
  if (counts.逃げ >= 3 || front >= 6) pace = "ハイペース";
  else if (counts.逃げ <= 1 && counts.先行 <= 2) pace = "スロー";

  if (race.pacePrediction && ["ハイペース", "平均", "スロー"].includes(race.pacePrediction)) {
    if (Math.abs(front - 4) < 2) pace = race.pacePrediction;
  }

  return {
    pace,
    counts,
    nige: counts.逃げ,
    senkou: counts.先行,
    sashi: counts.差し,
    oikomi: counts.追込,
  };
}

/**
 * 互換ラッパー: 指数→スコアの2段階
 * @deprecated 内部では calculateIndexes → calculateScore を使用
 */
export function calculateHorseScore(
  horse,
  race,
  aiSettings = {},
  paceForecast = null,
  corrections = null
) {
  const indexes = calculateIndexes(
    horse,
    race,
    aiSettings,
    paceForecast,
    corrections
  );
  const avg = averageIndexes([indexes]);
  const diff = calcIndexDiff(indexes, avg);
  return calculateScore(horse, indexes, diff, race, aiSettings, paceForecast);
}

/**
 * 指数 → スコア（表示・買い目用）
 * 展開補正・期待値補正を反映
 */
export function calculateScore(
  horse,
  indexes,
  indexDiff,
  race,
  aiSettings = {},
  paceForecast = null
) {
  const pace = paceForecast?.pace || "平均";

  // 展開補正（指数差ベース）
  let totalIndex = indexes.total;
  const paceAdj = Math.round(indexes.pace - INDEX_BASE) * 0.08;
  totalIndex = clampIndex(totalIndex + paceAdj);

  // 期待値補正
  const evAdj = Math.round(indexes.expectedValue - INDEX_BASE) * 0.1;
  totalIndex = clampIndex(totalIndex + evAdj);

  const score100 = indexToScore100(totalIndex);
  const ev100 = indexToScore100(indexes.expectedValue);
  const grade = scoreToGrade(score100);
  const stars = expectedValueToStars(ev100);

  return {
    ...horse,
    indexes: {
      ...indexes,
      total: Math.round(totalIndex),
    },
    indexDiff,
    score: {
      speed: indexToScore100(indexes.speed),
      stability: indexToScore100(indexes.stability),
      burst: indexToScore100(indexes.burst),
      stamina: indexToScore100(indexes.stamina),
      pace: indexToScore100(indexes.pace),
      aptitude: indexToScore100(indexes.aptitude),
      expectedValue: round1(ev100),
      total: round1(score100),
      grade,
      stars,
      paceAdj: round1(paceAdj),
      evAdj: round1(evAdj),
    },
    meta: {
      pace,
      raceTrack: race?.track || "芝",
    },
  };
}

/** 総合期待値（互換・指数スケール補助） */
export function calculateExpectedValue({ horse, indexes, aiSettings = {} }) {
  if (indexes?.expectedValue != null) return indexes.expectedValue;
  const winRate = Number(horse?.winRate) || 0;
  const odds = Math.max(1.1, Number(horse?.odds) || 10);
  const raw = INDEX_BASE + (winRate / 100) * odds * 80;
  return clampIndex(raw * (aiSettings.evFocus === false ? 0.95 : 1.05));
}

/**
 * 買い目生成: 単勝/馬連/ワイド/三連複/三連単 × 本命型/バランス型/高配当型
 */
export function recommendTickets(
  scoredHorses,
  aiSettings = {},
  paceForecast = null,
  ticketBias = "本命型",
  indexGap = 0
) {
  const byThink = [...scoredHorses].sort(
    (a, b) =>
      (b.thinking?.score || 0) - (a.thinking?.score || 0) ||
      b.indexes.total - a.indexes.total
  );
  const byIndex = [...scoredHorses].sort(
    (a, b) => b.indexes.total - a.indexes.total
  );
  const byEv = [...scoredHorses].sort(
    (a, b) => b.indexes.expectedValue - a.indexes.expectedValue
  );
  const byUpset = [...scoredHorses]
    .filter((h) => Number(h.popularity) >= 5)
    .sort(
      (a, b) =>
        b.indexes.expectedValue - a.indexes.expectedValue ||
        (b.thinking?.score || 0) - (a.thinking?.score || 0)
    );

  const pools = {
    本命型: pickNumbers(byThink.length ? byThink : byIndex, 5),
    バランス型: pickNumbers(
      mergeUnique(byThink.slice(0, 3), byEv.slice(0, 3), byIndex.slice(0, 2)),
      5
    ),
    高配当型: pickNumbers(
      byUpset.length ? byUpset : byEv,
      5
    ),
  };

  const ticketKinds = [
    { key: "単勝", mode: "win", payout: { 本命型: 2.4, バランス型: 3.1, 高配当型: 5.5 } },
    { key: "馬連", mode: "pair", payout: { 本命型: 4.8, バランス型: 6.2, 高配当型: 9.5 } },
    { key: "ワイド", mode: "pair", payout: { 本命型: 3.2, バランス型: 4.1, 高配当型: 6.8 } },
    { key: "三連複", mode: "box", payout: { 本命型: 7.5, バランス型: 9.2, 高配当型: 14.0 } },
    { key: "三連単", mode: "exact", payout: { 本命型: 11.0, バランス型: 14.5, 高配当型: 22.0 } },
  ];

  const types = {};
  const strategyMatrix = {};

  TICKET_STRATEGIES.forEach((strategy) => {
    strategyMatrix[strategy] = {};
  });

  ticketKinds.forEach((kind) => {
    types[kind.key] = {};
    TICKET_STRATEGIES.forEach((strategy) => {
      const nums = pools[strategy];
      const built = buildTicketType(kind.key, nums, kind.mode, {
        allocation: "",
        payoutRate: kind.payout[strategy],
        comment: buildStrategyComment(strategy, kind.key, paceForecast, indexGap),
        confidences: strategyConfidence(strategy),
        strategy,
      });
      types[kind.key][strategy] = built;
      strategyMatrix[strategy][kind.key] = built;
    });
    // 互換: types["三連複"] をバランス型として直接参照できるように
    types[kind.key].bets = types[kind.key]["バランス型"].bets;
    types[kind.key].allocation = "";
    types[kind.key].comment = types[kind.key]["バランス型"].comment;
    types[kind.key].payoutRate = types[kind.key]["バランス型"].payoutRate;
    types[kind.key].type = kind.key;
    types[kind.key].points = types[kind.key]["バランス型"].points;
    types[kind.key].amount = DEFAULT_BET;
  });

  const fundPlans = buildFundPlans(pools);

  return {
    defaultType: "三連複",
    defaultStrategy: ticketBias === "穴狙い" ? "高配当型" : "バランス型",
    defaultAmount: DEFAULT_BET,
    strategies: [...TICKET_STRATEGIES],
    budgets: [...TICKET_BUDGETS],
    bias: ticketBias,
    indexGap: Math.round(indexGap),
    patterns: pools,
    strategyMatrix,
    fundPlans,
    types,
  };
}

function mergeUnique(...lists) {
  const seen = new Set();
  const out = [];
  lists.flat().forEach((horse) => {
    if (!horse || seen.has(horse.number)) return;
    seen.add(horse.number);
    out.push(horse);
  });
  return out;
}

function strategyConfidence(strategy) {
  if (strategy === "本命型") return [97, 90, 84, 76, 70];
  if (strategy === "高配当型") return [88, 82, 76, 70, 64];
  return [94, 88, 82, 76, 70];
}

function buildStrategyComment(strategy, ticketType, paceForecast, indexGap) {
  const pace = paceForecast?.pace || "平均";
  const advantage = paceForecast?.advantage || "";
  return [
    `${strategy} × ${ticketType} で構成しています。`,
    "",
    `展開シミュは${pace}${advantage ? `（${advantage}）` : ""}です。`,
    `指数差 ${Math.round(indexGap)}。思考評価と期待値を組み合わせています。`,
  ];
}

/** 1000/3000/5000/10000円の資金配分 */
export function buildFundPlans(pools) {
  const plans = {};
  TICKET_BUDGETS.forEach((budget) => {
    plans[budget] = {
      本命型: allocateBudget(budget, [
        { label: "単勝軸", ratio: 0.4 },
        { label: "馬連固め", ratio: 0.35 },
        { label: "三連複押さえ", ratio: 0.25 },
      ]),
      バランス型: allocateBudget(budget, [
        { label: "三連複", ratio: 0.4 },
        { label: "馬連", ratio: 0.3 },
        { label: "ワイド", ratio: 0.2 },
        { label: "単勝", ratio: 0.1 },
      ]),
      高配当型: allocateBudget(budget, [
        { label: "三連単", ratio: 0.35 },
        { label: "三連複", ratio: 0.3 },
        { label: "ワイド穴", ratio: 0.25 },
        { label: "馬連流し", ratio: 0.1 },
      ]),
      hint: formatFundHint(budget, pools),
    };
  });
  return plans;
}

function allocateBudget(budget, slices) {
  const rows = slices.map((slice) => {
    const amount = Math.round((budget * slice.ratio) / 100) * 100;
    return {
      label: slice.label,
      ratio: Math.round(slice.ratio * 100),
      amount: Math.max(100, amount),
    };
  });
  // 端数調整
  const sum = rows.reduce((s, r) => s + r.amount, 0);
  if (rows.length && sum !== budget) {
    rows[0].amount += budget - sum;
  }
  return {
    total: budget,
    rows,
    text: rows.map((r) => `${r.label} ${r.amount.toLocaleString("ja-JP")}円`).join(" / "),
  };
}

function formatFundHint(budget, pools) {
  const honmei = pools?.本命型?.[0] || 1;
  const ana = pools?.高配当型?.[0] || pools?.バランス型?.[2] || 2;
  return `${budget.toLocaleString("ja-JP")}円: 軸${honmei}番 / 穴候補${ana}番`;
}

function buildTicketType(type, nums, mode, options) {
  const [a, b, c, d, e] = nums;
  const marks = ["◎", "〇", "▲", "△", "☆"];
  let combos = [];

  if (mode === "box") {
    combos = [`${a}-${c}-${e}`, `${a}-${e}-${d}`, `${a}-${b}-${e}`, `${b}-${c}-${e}`, `${c}-${e}-${d}`];
  } else if (mode === "exact") {
    combos = [`${a}→${c}→${e}`, `${a}→${e}→${c}`, `${c}→${a}→${e}`, `${a}→${b}→${e}`, `${e}→${a}→${c}`];
  } else if (mode === "pair") {
    combos = [`${a}-${e}`, `${a}-${c}`, `${c}-${e}`, `${a}-${d}`, `${b}-${e}`];
  } else {
    combos = nums.map(String);
  }

  const bets = combos.slice(0, MAX_TICKET).map((combo, index) => ({
    mark: marks[index] || "☆",
    combo,
    stars: Math.max(1, 5 - index),
    confidence: options.confidences[index] || 70,
  }));

  return {
    type,
    strategy: options.strategy || "バランス型",
    points: bets.length,
    amount: DEFAULT_BET,
    bets,
    allocation: options.allocation,
    comment: options.comment,
    payoutRate: options.payoutRate,
  };
}

function ticketComment(patternName, paceForecast, gapNote) {
  const pace = paceForecast?.pace || "平均";
  return [
    `${patternName}パターンで構成しています。`,
    "",
    gapNote || "",
    `展開予想は${pace}です。`,
    "思考評価と期待値指数を組み合わせています。",
  ].filter(Boolean);
}

/** 指数差・展開差・期待値差・学習結果から文章生成 */
export function createComment({
  top,
  upsetHorse,
  dangerHorse,
  overall,
  race,
  aiSettings,
  paceForecast,
  scoredHorses,
  avgIndexes,
  indexGap,
  ticketBias,
  learningInsight,
  learningMetrics,
}) {
  const lines = [];
  const pace = paceForecast?.pace || "平均";
  const sorted = [...(scoredHorses || [])].sort(
    (a, b) => b.indexes.total - a.indexes.total
  );
  const second = sorted[1];
  const avgTotal = avgIndexes?.total || INDEX_BASE;
  const topDiff = (top?.indexes?.total || 0) - avgTotal;
  const evDiff =
    (top?.indexes?.expectedValue || 0) - (avgIndexes?.expectedValue || INDEX_BASE);
  const paceDiff =
    (top?.indexes?.pace || 0) - (avgIndexes?.pace || INDEX_BASE);

  // 学習結果
  const learnLines = learningInsight?.lines || [];
  if (learnLines.length) {
    learnLines.forEach((line) => lines.push(line));
  } else if (learningMetrics?.aiRoi >= 110) {
    lines.push(`当AIでは高回収条件（AI回収率${Number(learningMetrics.aiRoi).toFixed(1)}%）`);
  }

  // 指数差
  if (indexGap >= INDEX_GAP_WIDE) {
    lines.push(
      `総合指数で${top?.horse || "本命"}が抜けています（指数差${Math.round(indexGap)}）。`
    );
  } else if (indexGap <= INDEX_GAP_CLOSE) {
    lines.push("指数差が小さい混戦です。");
  } else {
    lines.push(
      `総合指数1位は${top?.horse || "本命"}。2位との差は${Math.round(indexGap)}です。`
    );
  }

  // 期待値差
  if (top && evDiff < -20) {
    lines.push("指数1位ですが期待値はやや低めです。");
  } else if (top && evDiff > 30) {
    lines.push("指数上位かつ期待値も高い構成です。");
  } else if (second && second.indexes.expectedValue - (top?.indexes?.expectedValue || 0) > 40) {
    lines.push(
      `${second.horse}は指数より期待値指数が優位です。`
    );
  }

  // 展開差
  if (paceDiff >= 35) {
    lines.push("展開利が見込めます。");
  } else if (paceDiff <= -30) {
    lines.push("展開面ではやや不利な可能性があります。");
  } else if (pace === "ハイペース") {
    lines.push("ハイペース想定。差し・追込の展開利に注目です。");
  } else if (pace === "スロー") {
    lines.push("スロー想定。先行勢の展開利が見込めます。");
  }

  lines.push("");
  lines.push(
    `買い目は指数差に応じ${ticketBias || "本命型"}へ自動調整しています。`
  );
  lines.push(`穴馬は${upsetHorse?.horse || "穴馬候補"}。期待値指数を重視しています。`);

  if (dangerHorse?.horse) {
    lines.push(`${dangerHorse.horse}は人気に対して期待値指数が弱い危険人気です。`);
  }

  if (aiSettings?.precision === "high") {
    lines.push("");
    lines.push("高精度モードで適性・展開指数を強調しています。");
  }

  if (race?.trackCondition && race.trackCondition !== "良") {
    lines.push(`馬場は${race.trackCondition}。適性指数の差が出やすい条件です。`);
  }

  void overall;
  void topDiff;
  return lines;
}

/**
 * 各馬のAI分析レポートを生成（Ver1.2.0 プロ仕様）
 */
export function buildHorseReports({
  scoredHorses,
  race,
  paceForecast,
  avgIndexes,
  dangerHorse,
  upsetHorse,
  learningInsight,
}) {
  const ranked = [...(scoredHorses || [])].sort(
    (a, b) => b.indexes.total - a.indexes.total || b.winRate - a.winRate
  );
  const maxIndex = ranked[0]?.indexes?.total || INDEX_BASE;
  const roles = assignTicketRoles(ranked, dangerHorse, upsetHorse);
  const probs = estimateProbabilities(ranked);

  return ranked.map((horse, rank) => {
    const role = roles.get(horse.number) || "ヒモ向き";
    const aiIndex = Math.round(clamp(horse.indexes.total / 10, 1, 99));
    const confidence = calcHorseConfidence(horse, rank, maxIndex);
    const expectedValuePercent = calcExpectedValuePercent(horse);
    const evLevel = calcEvLevel(expectedValuePercent);
    const risk = calcHorseRisk(horse, rank);
    const ratings = buildRatings(horse, race, paceForecast);
    const factors = buildFactors(horse, race, paceForecast, avgIndexes, rank);
    const comments = buildHorseComments({
      horse,
      race,
      paceForecast,
      avgIndexes,
      rank,
      maxIndex,
      expectedValuePercent,
      factors,
      learningInsight,
      role,
    });
    const grade = horse.score?.grade || indexToGrade(horse.indexes.total);
    const fightLevel = gradeToFightStars(grade, confidence, rank);
    const breakdown = buildIndexBreakdown(horse, race, paceForecast, aiIndex);
    const gapFromTop = round1((horse.indexes.total - maxIndex) / 10);
    const probability = probs.get(horse.number) || {
      win: 0,
      place: 0,
      show: 0,
    };
    const ticketFits = buildTicketFits({
      role,
      confidence,
      expectedValuePercent,
      probability,
      rank,
      risk,
    });
    const miniRadar = {
      labels: ["スピード", "スタミナ", "瞬発力", "展開", "馬場", "距離"],
      values: [
        breakdown.speed,
        breakdown.stamina,
        breakdown.burst,
        breakdown.pace,
        breakdown.track,
        breakdown.distance,
      ],
    };

    return {
      number: horse.number,
      horse: horse.horse,
      mark: roleToMark(role, rank),
      role,
      roleComment: buildRoleComment(role, horse, expectedValuePercent),
      aiIndex,
      confidence,
      confidenceGauge: buildBlockGauge(confidence),
      expectedValuePercent,
      evLevel,
      evGauge: buildBlockGauge(Math.min(100, expectedValuePercent / 2)),
      risk,
      riskLabel: risk,
      riskLevel: risk,
      ratings,
      plusFactors: factors.plus,
      minusFactors: factors.minus,
      comments,
      grade,
      fightLevel,
      breakdown,
      gapFromTop,
      probability,
      ticketFits,
      miniRadar,
      indexes: horse.indexes,
      indexDiff: horse.indexDiff,
      popularity: horse.popularity,
      odds: horse.odds,
      winRate: horse.winRate,
      rank: rank + 1,
    };
  });
}

/** 10ブロックのゴールドゲージ文字列 */
export function buildBlockGauge(percent) {
  const p = clamp(Number(percent) || 0, 0, 100);
  const filled = Math.round(p / 10);
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)}`;
}

function buildIndexBreakdown(horse, race, paceForecast, aiIndex) {
  const idx = horse.indexes || {};
  return {
    speed: toDisplayScore(idx.speed),
    stamina: toDisplayScore(idx.stamina),
    burst: toDisplayScore(idx.burst),
    durability: toDisplayScore(idx.stability),
    pace: toDisplayScore(idx.pace),
    track: Math.round(trackAptitudeScore(horse, race)),
    distance: Math.round(distanceAptitudeScore(horse, race)),
    jockey: Math.round(jockeyRatingScore(horse)),
    expectedValue: toDisplayScore(idx.expectedValue),
    total: aiIndex,
  };
}

function toDisplayScore(indexValue) {
  return Math.round(clamp(Number(indexValue || 0) / 10, 1, 99));
}

function calcEvLevel(evPercent) {
  if (evPercent >= 160) return "激アツ";
  if (evPercent >= 120) return "高";
  if (evPercent >= 80) return "普通";
  return "低";
}

function estimateProbabilities(ranked) {
  const map = new Map();
  if (!ranked.length) return map;

  const temps = ranked.map((h) => (h.indexes.total || INDEX_BASE) / 40);
  const maxT = Math.max(...temps);
  const exps = temps.map((t) => Math.exp(t - maxT));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  const wins = exps.map((e) => e / sum);

  // 複勝・連対は上位指数との近さで近似
  ranked.forEach((horse, i) => {
    const win = wins[i] * 100;
    const place = clamp(win * 2.15 + (ranked.length - i) * 0.8, win, 92);
    const show = clamp(win * 1.55 + (ranked.length - i) * 0.6, win, 78);
    map.set(horse.number, {
      win: round1(win),
      place: round1(place),
      show: round1(show),
    });
  });
  return map;
}

function buildTicketFits({
  role,
  confidence,
  expectedValuePercent,
  probability,
  rank,
  risk,
}) {
  const win = probability?.win || 0;
  const place = probability?.place || 0;
  const ev = expectedValuePercent || 0;
  const conf = confidence || 70;

  let winFit = scoreToStars(win * 2.2 + (role === "本命向き" ? 15 : 0));
  let placeFit = scoreToStars(place * 1.1 + conf * 0.15);
  let quinella = scoreToStars(conf * 0.45 + (rank <= 2 ? 25 : 10) + win);
  let wide = scoreToStars(place * 0.7 + (role === "穴候補" ? 20 : 8) + ev * 0.08);
  let trio = scoreToStars(conf * 0.5 + (rank <= 4 ? 20 : 5) + ev * 0.1);
  let trifecta = scoreToStars(win * 1.5 + conf * 0.25 + (rank === 0 ? 15 : 0));

  if (role === "危険人気馬" || risk === "Very High") {
    winFit = Math.max(1, winFit - 2);
    trifecta = Math.max(1, trifecta - 1);
  }
  if (role === "穴候補") {
    wide = Math.min(5, wide + 1);
    trio = Math.min(5, trio + 1);
  }
  if (role === "本命向き") {
    winFit = Math.min(5, Math.max(winFit, 4));
    placeFit = Math.min(5, Math.max(placeFit, 4));
  }

  return [
    { type: "単勝", stars: winFit },
    { type: "複勝", stars: placeFit },
    { type: "馬連", stars: quinella },
    { type: "ワイド", stars: wide },
    { type: "三連複", stars: trio },
    { type: "三連単", stars: trifecta },
  ];
}

export function buildPaceScenario(paceForecast, paceLanes, ranked) {
  const pace = paceForecast?.pace || "平均";
  const nige =
    (paceLanes || []).find((l) => l.label === "逃げ")?.horses?.[0] || null;
  const senkou =
    (paceLanes || []).find((l) => l.label === "先行")?.horses?.[0] || null;
  const sashi =
    (paceLanes || []).find((l) => l.label === "差し")?.horses?.[0] || null;

  const nigeHorse = ranked.find((h) => h.horse === nige);
  const senkouHorse = ranked.find((h) => h.horse === senkou);
  const sashiHorse = ranked.find((h) => h.horse === sashi);

  const paceText =
    pace === "超スロー" || pace === "スロー"
      ? "前半はスロー。"
      : pace === "超ハイペース" || pace === "ハイペース"
        ? "前半はハイペース。"
        : "前半は平均ペース。";

  const frontText = nigeHorse
    ? `${nigeHorse.number}番が逃げ、`
    : "逃げ不在で流れ待ち、";
  const secondText = senkouHorse
    ? `${senkouHorse.number}番が番手。`
    : "先行勢が控える形。";
  const lateText = sashiHorse
    ? `直線で${sashiHorse.number}番が差してくる展開。`
    : "直線は差し追込の末脚勝負。";

  let text = `${paceText}${frontText}${secondText}${lateText}`;
  if (text.length > 200) text = text.slice(0, 197) + "…";
  return text;
}

export function buildFinalComment(horseReports, dangerHorse, upsetHorse) {
  const reports = horseReports || [];
  const stable =
    [...reports].sort(
      (a, b) =>
        b.confidence - a.confidence ||
        b.breakdown?.durability - a.breakdown?.durability
    )[0] || reports[0];
  const value =
    [...reports].sort(
      (a, b) => b.expectedValuePercent - a.expectedValuePercent
    )[0] || reports[0];
  const ana =
    reports.find((r) => r.role === "穴候補") ||
    reports.find((r) => r.horse === upsetHorse?.horse) ||
    reports[2];

  const lines = [];
  if (stable) {
    lines.push(
      `今回もっとも安定しているのは${stable.number}番。`
    );
  }
  if (value && value.number !== stable?.number) {
    lines.push(`期待値重視なら${value.number}番。`);
  } else if (value) {
    lines.push(`期待値も${value.number}番が上位。`);
  }
  if (ana) {
    lines.push(`人気を考慮すると${ana.number}番が穴候補。`);
  }
  if (dangerHorse?.horse) {
    const d = reports.find((r) => r.horse === dangerHorse.horse);
    if (d) lines.push(`${d.number}番は危険人気に注意。`);
  }
  return lines.join("");
}

function assignTicketRoles(ranked, dangerHorse, upsetHorse) {
  const roles = new Map();
  const dangerName = dangerHorse?.horse;
  const upsetName = upsetHorse?.horse;

  ranked.forEach((horse, rank) => {
    const pop = Number(horse.popularity) || 99;
    const ev = horse.indexes?.expectedValue || 0;
    let role = "ヒモ向き";

    if (rank === 0) role = "本命向き";
    else if (rank === 1) role = "対抗向き";
    else if (rank <= 3) role = "ヒモ向き";
    else if (pop >= 5 && ev >= INDEX_BASE + 40) role = "穴候補";
    else role = "ヒモ向き";

    if (horse.horse === dangerName || (pop <= 3 && ev < INDEX_BASE - 20 && rank > 0)) {
      role = "危険人気馬";
    }
    if (horse.horse === upsetName && role !== "本命向き") {
      role = "穴候補";
    }

    roles.set(horse.number, role);
  });

  // 本命が危険人気なら次点を本命に
  const top = ranked[0];
  if (top && roles.get(top.number) === "危険人気馬" && ranked[1]) {
    roles.set(ranked[1].number, "本命向き");
  }

  return roles;
}

function roleToMark(role, rank) {
  if (role === "本命向き") return "◎";
  if (role === "対抗向き") return "〇";
  if (role === "ヒモ向き") return rank <= 3 ? "▲" : "△";
  if (role === "穴候補") return "☆";
  if (role === "危険人気馬") return "注";
  return "△";
}

function buildRoleComment(role, horse, evPercent) {
  const name = horse.horse;
  if (role === "本命向き") {
    return `${name}は総合指数上位。軸候補として本命向きです。`;
  }
  if (role === "対抗向き") {
    return `${name}は本命に続く評価。対抗向きです。`;
  }
  if (role === "ヒモ向き") {
    return `${name}は相手関係でヒモ向きです。`;
  }
  if (role === "穴候補") {
    return `${name}は期待値${evPercent}%で穴候補です。`;
  }
  return `${name}は人気に対して期待値が弱く危険人気馬です。`;
}

function calcHorseConfidence(horse, rank, maxIndex) {
  const total = horse.indexes?.total || INDEX_BASE;
  const stability = horse.indexes?.stability || INDEX_BASE;
  const gap = maxIndex - total;
  const base = 78 + total * 0.018 + stability * 0.01 - gap * 0.08 - rank * 1.2;
  return Math.round(clamp(base, 55, 98));
}

function calcExpectedValuePercent(horse) {
  const winRate = Number(horse.winRate) || 1;
  const odds = Math.max(1.1, Number(horse.odds) || 10);
  const raw = (winRate / 100) * odds * 100;
  const indexBoost = ((horse.indexes?.expectedValue || INDEX_BASE) - INDEX_BASE) * 0.15;
  return Math.round(clamp(raw + indexBoost, 20, 320));
}

function calcHorseRisk(horse, rank) {
  const stability = horse.indexes?.stability || INDEX_BASE;
  const pop = Number(horse.popularity) || 99;
  const ev = horse.indexes?.expectedValue || INDEX_BASE;
  if (pop <= 2 && ev < INDEX_BASE - 30 && rank > 0) return "Very High";
  if (stability < INDEX_BASE - 80) return "Very High";
  if (pop <= 2 && ev < INDEX_BASE) return "High";
  if (stability < INDEX_BASE - 40 || rank >= 8) return "High";
  if (stability >= INDEX_BASE + 40 && rank <= 2) return "Low";
  if (rank <= 4 && stability >= INDEX_BASE) return "Low";
  return "Medium";
}

function buildRatings(horse, race, paceForecast) {
  const idx = horse.indexes || {};
  const distanceScore = distanceAptitudeScore(horse, race);
  const courseScore = courseAptitudeScore(horse, race);
  const trackScore = trackAptitudeScore(horse, race);
  const paceScore = paceAptitudeScore(horse, paceForecast);
  const jockeyScore = jockeyRatingScore(horse);

  return {
    speed: indexToStars(idx.speed),
    stamina: indexToStars(idx.stamina),
    burst: indexToStars(idx.burst),
    distance: scoreToStars(distanceScore),
    course: scoreToStars(courseScore),
    track: scoreToStars(trackScore),
    pace: scoreToStars(paceScore),
    jockey: scoreToStars(jockeyScore),
    expectedValue: indexToStars(idx.expectedValue),
  };
}

function buildFactors(horse, race, paceForecast, avgIndexes, rank) {
  const plus = [];
  const minus = [];
  const idx = horse.indexes || {};
  const diff = horse.indexDiff || {};
  const last3 = Array.isArray(horse.last3) ? horse.last3 : [];
  const pace = paceForecast?.pace || "平均";
  const style = horse.runningStyle || "差し";
  const weight = Number(horse.weight) || 55;
  const frame = Number(horse.frame) || 0;
  const pop = Number(horse.popularity) || 99;

  if (last3.length && averageNum(last3) <= 3) plus.push("前走好内容");
  if (diff.total > 30) plus.push("メンバー内で指数優位");
  if (idx.pace >= (avgIndexes?.pace || INDEX_BASE) + 30) plus.push("展開有利");
  if (trackAptitudeScore(horse, race) >= 75) plus.push("馬場適性高い");
  if (distanceAptitudeScore(horse, race) >= 75) {
    const raceDist = Number(race?.distance) || 1600;
    const horseType = horse.distanceType || "";
    if (horseType && guessDistanceTypeLocal(raceDist) !== horseType) {
      plus.push("距離延長プラス");
    } else {
      plus.push("距離適性高い");
    }
  }
  if (jockeyRatingScore(horse) >= 80) plus.push("騎手評価高い");
  if (Number(horse.odds) >= 5 && idx.expectedValue >= INDEX_BASE + 20) {
    plus.push("オッズ妙味あり");
  }
  if (pace === "ハイペース" && (style === "差し" || style === "追込")) {
    plus.push("展開有利");
  }
  if (pace === "スロー" && (style === "逃げ" || style === "先行")) {
    plus.push("展開有利");
  }
  if (rank === 0) plus.push("総合指数1位");

  if (weight >= 57) minus.push("斤量増");
  if (last3.length && last3[0] >= 8) minus.push("前走大敗");
  if (last3.length >= 3 && averageNum(last3) >= 7) minus.push("休み明け");
  if (frame >= 7) minus.push("外枠");
  if (idx.pace <= (avgIndexes?.pace || INDEX_BASE) - 30) minus.push("展開不利");
  if (trackAptitudeScore(horse, race) <= 40) minus.push("馬場適性不安");
  if (distanceAptitudeScore(horse, race) <= 40) minus.push("距離適性不安");
  if (pop <= 2 && idx.expectedValue < INDEX_BASE) minus.push("人気過剰");
  if ((horse.trackType || race?.track) !== (race?.track || "芝")) {
    minus.push("コース替わり");
  }

  const uniqPlus = [...new Set(plus)].slice(0, 5);
  const uniqMinus = [...new Set(minus)].slice(0, 5);
  if (!uniqPlus.length) uniqPlus.push("安定した基礎能力");
  if (!uniqMinus.length) uniqMinus.push("目立った減点なし");

  return { plus: uniqPlus, minus: uniqMinus };
}

function buildHorseComments({
  horse,
  race,
  paceForecast,
  avgIndexes,
  rank,
  maxIndex,
  expectedValuePercent,
  factors,
  learningInsight,
  role,
}) {
  const lines = [];
  const idx = horse.indexes || {};
  const pace = paceForecast?.pace || "平均";
  const nige = paceForecast?.nige ?? 0;
  const style = horse.runningStyle || "差し";

  if (rank === 0) {
    lines.push("前走指数がメンバー最上位。");
  } else if (idx.total >= maxIndex - 20) {
    lines.push("総合指数は上位グループ。拮抗した評価です。");
  } else {
    lines.push(`総合指数は${Math.round(idx.total)}で中団〜上位の位置づけです。`);
  }

  if (pace === "スロー" || nige <= 1) {
    if (style === "逃げ" || style === "先行") {
      lines.push("今回の展開では逃げ馬が少なく、好位でレースを進められる。");
    } else {
      lines.push("逃げ馬が少なくスロー寄り。差しは位置取りが鍵。");
    }
  } else if (pace === "ハイペース") {
    if (style === "差し" || style === "追込") {
      lines.push("ハイペース想定で差し・追込の展開利が見込める。");
    } else {
      lines.push("ハイペースでは先行負担に注意。");
    }
  } else {
    lines.push(`展開は平均ペース想定。脚質「${style}」との相性を評価。`);
  }

  const aptHigh =
    distanceAptitudeScore(horse, race) >= 70 &&
    trackAptitudeScore(horse, race) >= 70 &&
    jockeyRatingScore(horse) >= 70;
  if (aptHigh) {
    lines.push("距離・馬場・騎手との相性も高評価。");
  } else if (factors.plus.includes("馬場適性高い")) {
    lines.push("馬場適性を中心にプラス材料があります。");
  }

  const odds = Number(horse.odds) || 0;
  if (odds >= 5 && expectedValuePercent >= 120) {
    lines.push(`オッズ${odds}倍以上なら期待値が非常に高い。`);
  } else if (expectedValuePercent >= 100) {
    lines.push(`期待値は${expectedValuePercent}%で攻める価値あり。`);
  } else if (expectedValuePercent < 80) {
    lines.push("オッズ対比の期待値は抑えめ。過熱に注意。");
  }

  if (learningInsight?.exact?.roi >= 110) {
    lines.push(
      `過去同条件で回収率${Math.round(learningInsight.exact.roi)}%の学習実績あり。`
    );
  }

  lines.push(`買い目評価は「${role}」。`);
  return lines;
}

function distanceAptitudeScore(horse, race) {
  const distance = Number(race?.distance) || 1600;
  const type = horse.distanceType || guessDistanceTypeLocal(distance);
  const actual = guessDistanceTypeLocal(distance);
  if (type === actual) return 88;
  if (
    (type === "マイル" && (actual === "短距離" || actual === "中距離")) ||
    (type === "中距離" && (actual === "マイル" || actual === "長距離"))
  ) {
    return 68;
  }
  return 42;
}

function courseAptitudeScore(horse, race) {
  const winRate = Number(horse.winRate) || 0;
  const dir = race?.courseDirection || "左";
  if (dir === "左") return clamp(55 + winRate * 1.2, 30, 95);
  return clamp(50 + winRate, 30, 90);
}

function trackAptitudeScore(horse, race) {
  const raceTrack = race?.track || "芝";
  const horseTrack = horse.trackType || raceTrack;
  let score = horseTrack === raceTrack ? 82 : 38;
  const condition = race?.trackCondition || "良";
  if (condition !== "良" && horseTrack === "ダート") score += 10;
  if (condition !== "良" && raceTrack === "芝" && horse.runningStyle === "逃げ") {
    score -= 8;
  }
  return clamp(score, 20, 98);
}

function paceAptitudeScore(horse, paceForecast) {
  const pace = paceForecast?.pace || "平均";
  const style = horse.runningStyle || "差し";
  if (pace === "ハイペース") {
    if (style === "差し" || style === "追込") return 90;
    if (style === "逃げ") return 40;
    return 55;
  }
  if (pace === "スロー") {
    if (style === "逃げ" || style === "先行") return 88;
    if (style === "追込") return 42;
    return 60;
  }
  if (style === "先行" || style === "差し") return 75;
  return 65;
}

function jockeyRatingScore(horse) {
  const bonusMap = {
    武豊: 92,
    ルメール: 95,
    川田将雅: 90,
    横山武史: 82,
    戸崎圭太: 80,
    デムーロ: 86,
    福永祐一: 78,
    岩田康誠: 76,
    松山弘平: 72,
    坂井瑠星: 74,
  };
  return bonusMap[horse.jockey] || 60;
}

function indexToStars(index) {
  return scoreToStars(indexToScore100(index));
}

function scoreToStars(score) {
  if (score >= 88) return 5;
  if (score >= 78) return 4;
  if (score >= 68) return 3;
  if (score >= 55) return 2;
  return 1;
}

function gradeToFightStars(grade, confidence, rank) {
  if (grade === "S" && confidence >= 90) return 5;
  if (grade === "S" || (grade === "A" && rank <= 1)) return 4;
  if (grade === "A" || grade === "B") return 3;
  if (grade === "B") return 2;
  return rank <= 5 ? 2 : 1;
}

function guessDistanceTypeLocal(distance) {
  if (distance < 1400) return "短距離";
  if (distance <= 1800) return "マイル";
  if (distance <= 2200) return "中距離";
  return "長距離";
}

function averageNum(arr) {
  if (!arr.length) return 8;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/* ---------- helpers ---------- */

function normalizeSettings(settings = {}) {
  const ai = settings.ai || {};
  return {
    precision: ai.precision || settings.aiPrecision || "standard",
    evFocus: ai.evFocus !== false,
    popularityOrder: Boolean(ai.popularityOrder),
    upsetHighlight: ai.upsetHighlight !== false,
    dangerDisplay: ai.dangerDisplay !== false,
    notifications: settings.notifications || {},
    theme: settings.theme || { mode: "dark", locked: true },
  };
}

function calcTopIndexGap(byIndex) {
  if (!byIndex || byIndex.length < 2) return 0;
  return (byIndex[0]?.indexes?.total || 0) - (byIndex[1]?.indexes?.total || 0);
}

function resolveTicketBias(indexGap) {
  if (indexGap >= INDEX_GAP_WIDE) return "本命型";
  if (indexGap <= INDEX_GAP_CLOSE) return "穴狙い";
  return "本命型";
}

function buildOverall(scoredHorses, top, aiSettings, paceForecast, avgIndexes) {
  const avg = avgIndexes || averageIndexes(scoredHorses.map((h) => h.indexes));
  const grade = indexToGrade(top?.indexes?.total || avg.total);
  const confidence = Math.round(
    clamp(
      86 + (top?.indexes?.total || INDEX_BASE) * 0.012 + (aiSettings.precision === "high" ? 2 : 0),
      70,
      99
    )
  );

  const expectedReturn = Math.round(
    clamp(90 + (top?.indexes?.expectedValue || INDEX_BASE) * 0.12, 80, 220)
  );

  const risk = calcRisk(scoredHorses, paceForecast);

  return {
    grade,
    confidence,
    expectedReturn,
    risk,
    speed: indexToScore100(avg.speed),
    stability: indexToScore100(avg.stability),
    stamina: indexToScore100(avg.stamina),
    pace: indexToScore100(avg.pace),
    expectedValue: indexToScore100(avg.expectedValue),
    avgIndex: avg.total,
    comment: buildOverallComment(scoredHorses, top, paceForecast),
  };
}

function buildOverallComment(scoredHorses, top, paceForecast) {
  const gap = calcTopIndexGap(
    [...scoredHorses].sort((a, b) => b.indexes.total - a.indexes.total)
  );
  if (gap >= INDEX_GAP_WIDE) {
    return `${top?.horse || "本命"}の指数が突出。本命型で攻めやすいレースです`;
  }
  if (gap <= INDEX_GAP_CLOSE) {
    return "指数差が小さい混戦。期待値重視で拾う展開です";
  }
  const pace = paceForecast?.pace || "平均";
  return `総合指数上位を軸に、${pace}展開を織り込んだ予想です`;
}

function calcRisk(scoredHorses, paceForecast) {
  const tops = [...scoredHorses]
    .sort((a, b) => b.indexes.total - a.indexes.total)
    .slice(0, 3);
  if (tops.length < 2) return "中";
  const gap = (tops[0]?.indexes.total || 0) - (tops[2]?.indexes.total || 0);
  if (paceForecast?.pace === "ハイペース" && gap < 60) return "高";
  if (gap >= 100) return "低";
  return "中";
}

function pickDangerHorse(scoredHorses) {
  const sorted = [...scoredHorses].sort((a, b) => {
    const aRisk = Number(a.popularity) <= 3 ? a.indexes.expectedValue : 9999;
    const bRisk = Number(b.popularity) <= 3 ? b.indexes.expectedValue : 9999;
    return aRisk - bRisk;
  });
  const horse = sorted.find((h) => Number(h.popularity) <= 4) || sorted[sorted.length - 1];
  return {
    label: "危険人気馬",
    horse: horse?.horse || "-",
    grade: "C",
    reason: "人気に対して期待値指数が弱いです。",
  };
}

function pickUpsetHorse(scoredHorses, dangerHorse) {
  const sorted = [...scoredHorses].sort(
    (a, b) => b.indexes.expectedValue - a.indexes.expectedValue
  );
  const horse =
    sorted.find(
      (h) =>
        h.horse !== dangerHorse?.horse &&
        Number(h.popularity) >= 3 &&
        h.score.grade !== "C"
    ) ||
    sorted[1] ||
    sorted[0];

  return {
    label: "穴馬候補",
    horse: horse?.horse || "-",
    grade: horse?.score?.grade || "A",
    reason: "期待値指数が高く、指数差を突ける候補です。",
  };
}

function buildPaceLanes(scoredHorses) {
  const groups = { 逃げ: [], 先行: [], 差し: [], 追込: [] };
  scoredHorses.forEach((horse) => {
    const style = horse.runningStyle || "差し";
    if (groups[style]) groups[style].push(horse);
  });
  Object.keys(groups).forEach((key) => {
    groups[key].sort((a, b) => b.indexes.total - a.indexes.total);
  });

  return [
    { label: "逃げ", horses: groups.逃げ.slice(0, 1).map((h) => h.horse) },
    { label: "先行", horses: groups.先行.slice(0, 2).map((h) => h.horse) },
    { label: "差し", horses: groups.差し.slice(0, 3).map((h) => h.horse) },
    { label: "追込", horses: groups.追込.slice(0, 2).map((h) => h.horse) },
  ].map((lane) => ({
    ...lane,
    horses: lane.horses.length ? lane.horses : ["-"],
  }));
}

function buildRadar(scoredHorses, overall) {
  const top = [...scoredHorses]
    .sort((a, b) => b.indexes.total - a.indexes.total)
    .slice(0, 3);
  const avg = top.length
    ? averageIndexes(top.map((h) => h.indexes))
    : {
        expectedValue: INDEX_BASE,
        speed: INDEX_BASE,
        stamina: INDEX_BASE,
        stability: INDEX_BASE,
        pace: INDEX_BASE,
      };
  return {
    labels: ["能力", "スピード", "末脚", "安定感", "適性"],
    values: [
      Math.round(indexToScore100(avg.expectedValue)),
      Math.round(indexToScore100(avg.speed)),
      Math.round(indexToScore100(avg.burst ?? avg.stamina)),
      Math.round(indexToScore100(avg.stability)),
      Math.round(indexToScore100(avg.aptitude ?? avg.pace)),
    ],
  };
}

function pickNumbers(list, count) {
  const nums = list.slice(0, count).map((h) => h.number);
  while (nums.length < count) {
    nums.push(nums[nums.length - 1] || 1);
  }
  return nums;
}

function indexToScore100(index) {
  return clamp((Number(index) || 0) / 10, 0, 100);
}

function indexToGrade(index) {
  return scoreToGrade(indexToScore100(index));
}

function scoreToGrade(score) {
  if (score >= 88) return "S";
  if (score >= 78) return "A";
  if (score >= 68) return "B";
  return "C";
}

function expectedValueToStars(ev) {
  if (ev >= 88) return 5;
  if (ev >= 78) return 4;
  if (ev >= 68) return 3;
  if (ev >= 58) return 2;
  return 1;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function clampIndex(value) {
  return Math.min(999, Math.max(0, value));
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}
