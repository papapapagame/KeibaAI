/* ========================================
   PAPAPA IQ KEIBA - thinking-engine.js
   Ver2.0.0 AI思考エンジン / 展開シミュレーター
   予想家思考: 能力→近走→展開→適性→騎手→斤量→枠→オッズ
   ======================================== */

import {
  INDEX_BASE,
  THINKING_WEIGHT,
  THINKING_WEIGHT_STORAGE_KEY,
} from "./config.js";

const JOCKEY_SCORE = {
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

/**
 * 展開シミュレーター
 * 逃げ/先行/差し/追込 → 超ハイ〜超スロー + 有利脚質
 */
export function simulatePace(horses = []) {
  const counts = { 逃げ: 0, 先行: 0, 差し: 0, 追込: 0 };
  (horses || []).forEach((horse) => {
    const style = horse.runningStyle || "差し";
    if (counts[style] != null) counts[style] += 1;
  });

  const front = counts.逃げ + counts.先行 * 0.55;
  let pace = "平均";
  if (counts.逃げ >= 4 || front >= 7) pace = "超ハイペース";
  else if (counts.逃げ >= 3 || front >= 5.5) pace = "ハイペース";
  else if (counts.逃げ === 0 && counts.先行 <= 1) pace = "超スロー";
  else if (counts.逃げ <= 1 && counts.先行 <= 2) pace = "スロー";

  let advantage = "先行有利";
  if (pace === "超ハイペース" || pace === "ハイペース") {
    advantage = counts.差し + counts.追込 >= counts.逃げ + counts.先行 ? "差し有利" : "追込有利";
    if (counts.差し >= counts.追込) advantage = "差し有利";
    else advantage = "追込有利";
  } else if (pace === "超スロー" || pace === "スロー") {
    advantage = counts.逃げ >= 1 ? "逃げ有利" : "先行有利";
  } else {
    advantage = "先行有利";
  }

  return {
    pace,
    advantage,
    counts,
    nige: counts.逃げ,
    senkou: counts.先行,
    sashi: counts.差し,
    oikomi: counts.追込,
  };
}

/** 学習反映済みの思考重み */
export function getThinkingWeights() {
  const base = { ...THINKING_WEIGHT };
  try {
    const raw = localStorage.getItem(THINKING_WEIGHT_STORAGE_KEY);
    if (!raw) return base;
    const overlay = JSON.parse(raw);
    return normalizeThinkingWeights({ ...base, ...overlay });
  } catch {
    return base;
  }
}

export function saveThinkingWeights(weights) {
  try {
    localStorage.setItem(
      THINKING_WEIGHT_STORAGE_KEY,
      JSON.stringify(normalizeThinkingWeights(weights))
    );
  } catch {
    /* ignore */
  }
}

/**
 * 各馬を予想家思考で評価
 * @returns scored horse with thinking object
 */
export function evaluateHorseThinking(horse, race, paceSim, allHorses = [], weights = null) {
  const w = weights || getThinkingWeights();
  const idx = horse.indexes || {};
  const factors = {
    ability: scoreAbility(horse, idx),
    recent: scoreRecent(horse),
    pace: scorePaceFit(horse, paceSim),
    track: scoreTrack(horse, race),
    distance: scoreDistance(horse, race),
    course: scoreCourse(horse, race),
    jockey: scoreJockey(horse),
    weight: scoreWeight(horse),
    gate: scoreGate(horse, allHorses.length),
    odds: scoreOddsValue(horse, idx),
  };

  let total = 0;
  Object.keys(w).forEach((key) => {
    total += (factors[key] || 0) * (w[key] || 0);
  });

  // 展開補正（ペース有利脚質）
  total = applyPaceAdvantage(total, horse, paceSim);

  const oddsLabel = judgeOddsLabel(horse, idx, allHorses);
  const thinkingScore = clamp(total, 0, 100);

  return {
    factors,
    weights: w,
    score: round1(thinkingScore),
    oddsLabel,
    paceFit: factors.pace,
    ability: factors.ability,
    recent: factors.recent,
  };
}

/**
 * レース全馬へ思考評価を付与し、危険人気・穴馬を検出
 */
export function analyzeThinkingField(scoredHorses, race, paceSim) {
  const weights = getThinkingWeights();
  const withThinking = (scoredHorses || []).map((horse) => {
    const thinking = evaluateHorseThinking(
      horse,
      race,
      paceSim,
      scoredHorses,
      weights
    );
    return { ...horse, thinking };
  });

  const byThinking = [...withThinking].sort(
    (a, b) => b.thinking.score - a.thinking.score || b.indexes.total - a.indexes.total
  );

  byThinking.forEach((horse, rank) => {
    horse.thinking.rank = rank + 1;
  });

  const dangerList = detectDangerFavorites(byThinking);
  const upsetList = detectDarkHorses(byThinking);

  return {
    horses: withThinking,
    byThinking,
    paceSim,
    weights,
    dangerList,
    upsetList,
    dangerHorse: toInsightHorse(dangerList[0], "危険人気馬", "人気に対して思考評価が弱いです。"),
    upsetHorse: toInsightHorse(upsetList[0], "穴馬候補", "人気以上の思考評価・期待値があります。"),
  };
}

/** 人気上位なのに指数・期待値・近走・展開が悪い */
export function detectDangerFavorites(byThinking) {
  return byThinking
    .filter((h) => {
      const pop = Number(h.popularity) || 99;
      const t = h.thinking || {};
      const idx = h.indexes || {};
      if (pop > 3) return false;
      const weakIndex = (idx.total || 0) < INDEX_BASE + 40;
      const weakEv = (idx.expectedValue || 0) < INDEX_BASE;
      const weakRecent = (t.recent || 0) < 55;
      const weakPace = (t.pace || 0) < 55;
      const weakThink = (t.score || 0) < 62;
      const badCount = [weakIndex, weakEv, weakRecent, weakPace, weakThink].filter(Boolean)
        .length;
      return badCount >= 2 || t.oddsLabel === "危険人気";
    })
    .sort((a, b) => Number(a.popularity) - Number(b.popularity));
}

/** 人気低めだが期待値・展開・指数が高い */
export function detectDarkHorses(byThinking) {
  return byThinking
    .filter((h) => {
      const pop = Number(h.popularity) || 99;
      const t = h.thinking || {};
      const idx = h.indexes || {};
      if (pop < 5) return false;
      const strongEv = (idx.expectedValue || 0) >= INDEX_BASE + 30;
      const strongPace = (t.pace || 0) >= 68;
      const strongIndex = (idx.total || 0) >= INDEX_BASE + 20;
      const strongThink = (t.score || 0) >= 65;
      const good = [strongEv, strongPace, strongIndex, strongThink].filter(Boolean).length;
      return good >= 2 || t.oddsLabel === "妙味あり";
    })
    .sort((a, b) => b.thinking.score - a.thinking.score);
}

/**
 * 結果から思考重みを微調整（低学習率）
 */
export function learnThinkingWeights(record, learningRate = 0.08) {
  const weights = getThinkingWeights();
  const hit = record?.learning?.hit;
  const lr = Math.min(0.12, Math.max(0.02, learningRate));

  if (hit) {
    weights.pace = weights.pace + lr * 0.01;
    weights.ability = weights.ability + lr * 0.008;
    weights.odds = weights.odds + lr * 0.004;
  } else {
    weights.recent = weights.recent + lr * 0.01;
    weights.track = weights.track + lr * 0.006;
    weights.odds = Math.max(0.01, weights.odds - lr * 0.003);
  }

  const next = normalizeThinkingWeights(weights);
  saveThinkingWeights(next);
  return next;
}

/* ---------- factor scorers (0-100) ---------- */

function scoreAbility(horse, idx) {
  const total = (idx.total || INDEX_BASE) / 10;
  const speed = (idx.speed || INDEX_BASE) / 10;
  const stamina = (idx.stamina || INDEX_BASE) / 10;
  return clamp(total * 0.5 + speed * 0.25 + stamina * 0.25, 0, 100);
}

function scoreRecent(horse) {
  const last3 = Array.isArray(horse.last3) ? horse.last3 : [];
  if (!last3.length) return 55;
  const avg = last3.reduce((a, b) => a + b, 0) / last3.length;
  // 着順が良いほど高得点
  return clamp(100 - avg * 8, 15, 98);
}

function scorePaceFit(horse, paceSim) {
  const style = horse.runningStyle || "差し";
  const pace = paceSim?.pace || "平均";
  const advantage = paceSim?.advantage || "";

  let base = 60;
  if (pace === "超ハイペース" || pace === "ハイペース") {
    if (style === "差し" || style === "追込") base = 88;
    else if (style === "逃げ") base = 35;
    else base = 50;
  } else if (pace === "超スロー" || pace === "スロー") {
    if (style === "逃げ" || style === "先行") base = 90;
    else if (style === "追込") base = 38;
    else base = 55;
  } else if (style === "先行" || style === "差し") {
    base = 72;
  }

  if (advantage.includes(style.replace("込", "")) || advantage.startsWith(style.slice(0, 2))) {
    base += 6;
  }
  if (
    (advantage === "差し有利" && style === "差し") ||
    (advantage === "追込有利" && style === "追込") ||
    (advantage === "逃げ有利" && style === "逃げ") ||
    (advantage === "先行有利" && style === "先行")
  ) {
    base += 8;
  }

  return clamp(base, 20, 99);
}

function scoreTrack(horse, race) {
  const raceTrack = race?.track || "芝";
  const horseTrack = horse.trackType || raceTrack;
  let score = horseTrack === raceTrack ? 82 : 40;
  const condition = race?.trackCondition || "良";
  if (condition !== "良") {
    if (horseTrack === "ダート") score += 10;
    if (raceTrack === "芝" && horse.runningStyle === "逃げ") score -= 8;
  }
  return clamp(score, 20, 98);
}

function scoreDistance(horse, race) {
  const distance = Number(race?.distance) || 1600;
  const type = horse.distanceType || guessDistanceType(distance);
  const actual = guessDistanceType(distance);
  if (type === actual) return 88;
  if (
    (type === "マイル" && (actual === "短距離" || actual === "中距離")) ||
    (type === "中距離" && (actual === "マイル" || actual === "長距離"))
  ) {
    return 68;
  }
  return 42;
}

function scoreCourse(horse, race) {
  const winRate = Number(horse.winRate) || 0;
  const dir = race?.courseDirection || "左";
  if (dir === "左") return clamp(55 + winRate * 1.2, 30, 95);
  return clamp(50 + winRate, 30, 90);
}

function scoreJockey(horse) {
  return JOCKEY_SCORE[horse.jockey] || 60;
}

function scoreWeight(horse) {
  const w = Number(horse.weight) || 55;
  if (w <= 54) return 78;
  if (w <= 56) return 70;
  if (w <= 57) return 58;
  return 45;
}

function scoreGate(horse, fieldSize = 16) {
  const frame = Number(horse.frame) || 4;
  const size = Math.max(8, fieldSize || 16);
  // 中枠やや有利、大外不利
  if (frame <= 2) return 62;
  if (frame <= 5) return 75;
  if (frame <= 6) return 68;
  if (frame >= 7 && size >= 14) return 48;
  return 55;
}

function scoreOddsValue(horse, idx) {
  const pop = Number(horse.popularity) || 99;
  const ai = (idx.total || INDEX_BASE) / 10;
  const expectedPop = clamp(18 - ai / 6, 1, 16);
  const gap = expectedPop - pop;
  // AI評価が高いのに人気薄い → 高得点
  if (gap >= 3) return 90;
  if (gap >= 1) return 75;
  if (gap <= -3) return 35;
  if (gap <= -1) return 48;
  return 60;
}

function judgeOddsLabel(horse, idx, allHorses) {
  const pop = Number(horse.popularity) || 99;
  const sorted = [...(allHorses || [])].sort(
    (a, b) => (b.indexes?.total || 0) - (a.indexes?.total || 0)
  );
  const aiRank = sorted.findIndex((h) => h.number === horse.number) + 1 || 99;
  const total = idx.total || INDEX_BASE;

  if (pop <= 3 && (aiRank >= pop + 3 || total < INDEX_BASE + 20)) {
    return "危険人気";
  }
  if (aiRank > 0 && aiRank + 2 <= pop && total >= INDEX_BASE) {
    return "妙味あり";
  }
  return "妥当";
}

function applyPaceAdvantage(total, horse, paceSim) {
  const style = horse.runningStyle || "差し";
  const advantage = paceSim?.advantage || "";
  let delta = 0;
  if (advantage === "差し有利" && style === "差し") delta = 3;
  if (advantage === "追込有利" && style === "追込") delta = 3;
  if (advantage === "逃げ有利" && style === "逃げ") delta = 3;
  if (advantage === "先行有利" && style === "先行") delta = 2.5;
  if (
    (advantage === "差し有利" || advantage === "追込有利") &&
    (style === "逃げ" || style === "先行")
  ) {
    delta = -2;
  }
  if (
    (advantage === "逃げ有利" || advantage === "先行有利") &&
    (style === "差し" || style === "追込")
  ) {
    delta = -2;
  }
  return total + delta;
}

function toInsightHorse(horse, label, reason) {
  if (!horse) {
    return { label, horse: "-", grade: "C", reason };
  }
  return {
    label,
    horse: horse.horse,
    grade: horse.score?.grade || "B",
    reason:
      horse.thinking?.oddsLabel === "危険人気" || horse.thinking?.oddsLabel === "妙味あり"
        ? `${reason}（${horse.thinking.oddsLabel}）`
        : reason,
    number: horse.number,
    thinkingScore: horse.thinking?.score,
  };
}

function normalizeThinkingWeights(weights) {
  const keys = Object.keys(THINKING_WEIGHT);
  const safe = {};
  keys.forEach((key) => {
    safe[key] = Math.max(0.01, Number(weights[key]) || THINKING_WEIGHT[key]);
  });
  const sum = keys.reduce((a, k) => a + safe[k], 0) || 1;
  const out = {};
  keys.forEach((key) => {
    out[key] = Math.round((safe[key] / sum) * 1000) / 1000;
  });
  return out;
}

function guessDistanceType(distance) {
  if (distance < 1400) return "短距離";
  if (distance <= 1800) return "マイル";
  if (distance <= 2200) return "中距離";
  return "長距離";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}
