/* ========================================
   PAPAPA IQ KEIBA - index-engine.js
   Ver0.9.9 指数エンジン（0〜999）
   ローカル実装 / 将来 OpenAI・Gemini 差し替え可
   ======================================== */

import {
  INDEX_BASE,
  INDEX_MAX,
  INDEX_WEIGHT,
  WEIGHT_DISTANCE,
  WEIGHT_JOCKEY,
  WEIGHT_SPEED,
  WEIGHT_TRACK,
  WEIGHT_VALUE,
} from "./config.js";

const JOCKEY_BONUS = {
  武豊: 8,
  ルメール: 9,
  川田将雅: 7,
  横山武史: 5,
  戸崎圭太: 5,
  デムーロ: 6,
  福永祐一: 4,
  岩田康誠: 4,
  松山弘平: 3,
  坂井瑠星: 3,
};

/**
 * 各馬の指数を算出（0〜999）
 * スピード / 安定 / 瞬発 / 持久 / 展開 / 適性 / 期待値 / 総合
 * corrections: 学習レイヤー補正（任意）
 */
export function calculateIndexes(
  horse,
  race,
  aiSettings = {},
  paceForecast = null,
  corrections = null
) {
  const c = normalizeCorrections(corrections);
  const pace = paceForecast?.pace || "平均";
  const precisionBoost = getPrecisionBoost(aiSettings.precision);
  const last3 = Array.isArray(horse.last3) ? horse.last3 : [];
  const last3Avg = last3.length ? average(last3) : 8;
  const last3Bonus = (18 - last3Avg) * 12;

  const speed = clampIndex(
    (INDEX_BASE +
      Number(horse.winRate || 0) * 8.5 +
      (isFront(horse) ? 45 : 0) +
      last3Bonus * 0.35) *
      precisionBoost *
      c.weights.speed +
      c.indexOffsets.speed
  );

  const stability = clampIndex(
    (INDEX_BASE +
      Number(horse.placeRate || 0) * 5.2 +
      last3Bonus * 0.4 -
      last3Variance(last3) * 8) *
      precisionBoost +
      c.indexOffsets.stability
  );

  const burst = clampIndex(
    (INDEX_BASE +
      (isCloser(horse) ? 55 : 10) +
      (18 - last3Avg) * 14 +
      Number(horse.winRate || 0) * 2.5) *
      precisionBoost +
      c.indexOffsets.burst
  );

  const stamina = clampIndex(
    (INDEX_BASE +
      Number(horse.winRate || 0) * 4.5 +
      (isCloser(horse) ? 40 : 15) +
      distanceFitRaw(horse, race) * 6 * c.distanceBoost +
      last3Bonus * 0.25) *
      precisionBoost +
      c.indexOffsets.stamina
  );

  const paceIndex = clampIndex(
    (INDEX_BASE +
      stylePaceBase(horse) +
      paceFitRaw(horse, pace) * 7 * c.paceBoost +
      Number(horse.winRate || 0) * 2) *
      precisionBoost *
      (0.85 + c.weights.speed * 0.15) +
      c.indexOffsets.pace
  );

  const aptitude = clampIndex(
    (INDEX_BASE +
      trackFitRaw(horse, race) * 8 * c.weights.track * c.trackBoost +
      distanceFitRaw(horse, race) * 7 * c.weights.distance * c.distanceBoost +
      courseFitRaw(horse, race) * 5 +
      jockeyFitRaw(horse) * 6 * c.weights.jockey) *
      precisionBoost +
      c.indexOffsets.aptitude
  );

  const expectedValue = clampIndex(
    (INDEX_BASE +
      oddsEvRaw(horse) * 3.2 * c.weights.value * c.evBoost +
      favoriteEvAdj(horse, aiSettings) +
      paceFitRaw(horse, pace) * 2.5 * c.paceBoost +
      trackFitRaw(horse, race) * 2 * c.trackBoost) *
      precisionBoost +
      c.indexOffsets.expectedValue
  );

  const weights = c.indexWeight;
  const total = clampIndex(
    speed * weights.speed +
      stability * weights.stability +
      burst * weights.burst +
      stamina * weights.stamina +
      paceIndex * weights.pace +
      aptitude * weights.aptitude +
      expectedValue * weights.expectedValue +
      c.indexOffsets.total
  );

  return {
    speed: Math.round(speed),
    stability: Math.round(stability),
    burst: Math.round(burst),
    stamina: Math.round(stamina),
    pace: Math.round(paceIndex),
    aptitude: Math.round(aptitude),
    expectedValue: Math.round(expectedValue),
    total: Math.round(total),
  };
}

function normalizeCorrections(corrections) {
  return {
    weights: {
      speed: corrections?.weights?.speed ?? WEIGHT_SPEED,
      track: corrections?.weights?.track ?? WEIGHT_TRACK,
      distance: corrections?.weights?.distance ?? WEIGHT_DISTANCE,
      jockey: corrections?.weights?.jockey ?? WEIGHT_JOCKEY,
      value: corrections?.weights?.value ?? WEIGHT_VALUE,
    },
    indexWeight: {
      ...INDEX_WEIGHT,
      ...(corrections?.indexWeight || {}),
    },
    paceBoost: corrections?.paceBoost ?? 1,
    trackBoost: corrections?.trackBoost ?? 1,
    distanceBoost: corrections?.distanceBoost ?? 1,
    evBoost: corrections?.evBoost ?? 1,
    indexOffsets: {
      speed: 0,
      stability: 0,
      burst: 0,
      stamina: 0,
      pace: 0,
      aptitude: 0,
      expectedValue: 0,
      total: 0,
      ...(corrections?.indexOffsets || {}),
    },
  };
}

/** 指数のレース平均 */
export function averageIndexes(indexList = []) {
  if (!indexList.length) {
    return {
      speed: INDEX_BASE,
      stability: INDEX_BASE,
      burst: INDEX_BASE,
      stamina: INDEX_BASE,
      pace: INDEX_BASE,
      aptitude: INDEX_BASE,
      expectedValue: INDEX_BASE,
      total: INDEX_BASE,
    };
  }

  const keys = [
    "speed",
    "stability",
    "burst",
    "stamina",
    "pace",
    "aptitude",
    "expectedValue",
    "total",
  ];
  const sum = Object.fromEntries(keys.map((k) => [k, 0]));
  indexList.forEach((idx) => {
    keys.forEach((k) => {
      sum[k] += Number(idx[k]) || 0;
    });
  });
  const n = indexList.length;
  return Object.fromEntries(
    keys.map((k) => [k, Math.round(sum[k] / n)])
  );
}

/** 平均との差 */
export function calcIndexDiff(indexes, avg) {
  return {
    speed: indexes.speed - avg.speed,
    stability: indexes.stability - avg.stability,
    burst: indexes.burst - avg.burst,
    stamina: indexes.stamina - avg.stamina,
    pace: indexes.pace - avg.pace,
    aptitude: indexes.aptitude - avg.aptitude,
    expectedValue: indexes.expectedValue - avg.expectedValue,
    total: indexes.total - avg.total,
  };
}

/* ---------- raw helpers ---------- */

function isFront(horse) {
  const style = horse.runningStyle || "差し";
  return style === "逃げ" || style === "先行";
}

function isCloser(horse) {
  const style = horse.runningStyle || "差し";
  return style === "差し" || style === "追込";
}

function stylePaceBase(horse) {
  const style = horse.runningStyle || "差し";
  if (style === "逃げ") return 90;
  if (style === "先行") return 60;
  if (style === "差し") return 35;
  return 20;
}

function paceFitRaw(horse, pace) {
  const style = horse.runningStyle || "差し";
  if (pace === "ハイペース") {
    if (style === "差し" || style === "追込") return 10;
    if (style === "逃げ") return -8;
    return -2;
  }
  if (pace === "スロー") {
    if (style === "逃げ" || style === "先行") return 9;
    if (style === "追込") return -6;
    return 0;
  }
  if (style === "先行" || style === "差し") return 4;
  return 1;
}

function trackFitRaw(horse, race) {
  const raceTrack = race?.track || "芝";
  const condition = race?.trackCondition || "良";
  const horseTrack = horse.trackType || raceTrack;
  let fit = horseTrack === raceTrack ? 8 : -6;

  if (condition === "稍重" || condition === "重" || condition === "不良") {
    if (horseTrack === "ダート") fit += 5;
    if (raceTrack === "芝" && horse.runningStyle === "逃げ") fit -= 2;
  }
  if (race?.weather === "雨") fit += horseTrack === "ダート" ? 3 : -2;
  return fit;
}

function distanceFitRaw(horse, race) {
  const distance = Number(race?.distance) || 1600;
  const type = horse.distanceType || guessDistanceType(distance);
  const actual = guessDistanceType(distance);
  if (type === actual) return 9;
  if (
    (type === "マイル" && (actual === "短距離" || actual === "中距離")) ||
    (type === "中距離" && (actual === "マイル" || actual === "長距離"))
  ) {
    return 3;
  }
  return -5;
}

function courseFitRaw(horse, race) {
  const dir = race?.courseDirection || "左";
  const winRate = Number(horse.winRate) || 0;
  if (dir === "左") return winRate >= 12 ? 4 : 1;
  return winRate >= 10 ? 3 : 0;
}

function jockeyFitRaw(horse) {
  const name = horse.jockey || "";
  const bonus = JOCKEY_BONUS[name] ?? 1;
  const weight = Number(horse.weight) || 55;
  const weightAdj = weight >= 57 ? -1 : weight <= 54 ? 1 : 0;
  return bonus + weightAdj;
}

function oddsEvRaw(horse) {
  const winRate = Number(horse.winRate) || 1;
  const odds = Math.max(1.1, Number(horse.odds) || 10);
  const raw = (winRate / 100) * odds * 100;
  return clamp(raw * 0.85 + (odds > 15 ? 8 : 0), 0, 120);
}

function favoriteEvAdj(horse, aiSettings) {
  const popularity = Number(horse.popularity) || 99;
  const favorite = horse.favorite === true || popularity <= 3;
  if (favorite) return aiSettings.evFocus === false ? 20 : -15;
  if (popularity >= 10) return aiSettings.evFocus !== false ? 35 : 5;
  return 10;
}

function last3Variance(last3) {
  if (!last3.length) return 3;
  const avg = average(last3);
  const v = last3.reduce((s, n) => s + Math.abs(n - avg), 0) / last3.length;
  return v;
}

function guessDistanceType(distance) {
  if (distance < 1400) return "短距離";
  if (distance <= 1800) return "マイル";
  if (distance <= 2200) return "中距離";
  return "長距離";
}

function getPrecisionBoost(precision) {
  if (precision === "fast") return 0.97;
  if (precision === "high") return 1.03;
  return 1;
}

function average(arr) {
  if (!arr.length) return 8;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function clampIndex(value) {
  return Math.min(INDEX_MAX, Math.max(0, value));
}
