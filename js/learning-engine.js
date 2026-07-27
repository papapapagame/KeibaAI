/* ========================================
   PAPAPA IQ KEIBA - learning-engine.js
   Ver1.0.0 学習レイヤー
   過去成績 → 補正更新 → 指数更新 → 予想
   ローカル実装 / 将来 OpenAI・Gemini 差し替え可
   ======================================== */

import {
  AI_NAME,
  DEBUG_MODE,
  INDEX_BASE,
  INDEX_WEIGHT,
  LEARNING_RATE,
  LEARNING_STORAGE_KEY,
  WEIGHT_DISTANCE,
  WEIGHT_JOCKEY,
  WEIGHT_SPEED,
  WEIGHT_TRACK,
  WEIGHT_VALUE,
} from "./config.js";
import { formatDateTime, loadJson } from "./utils.js";
import { learnThinkingWeights } from "./thinking-engine.js";

let cachedState = null;

/** 既定補正値 */
export function createDefaultCorrections() {
  return {
    weights: {
      speed: WEIGHT_SPEED,
      track: WEIGHT_TRACK,
      distance: WEIGHT_DISTANCE,
      jockey: WEIGHT_JOCKEY,
      value: WEIGHT_VALUE,
    },
    indexWeight: { ...INDEX_WEIGHT },
    paceBoost: 1,
    trackBoost: 1,
    distanceBoost: 1,
    evBoost: 1,
    indexOffsets: {
      speed: 0,
      stability: 0,
      burst: 0,
      stamina: 0,
      pace: 0,
      aptitude: 0,
      expectedValue: 0,
      total: 0,
    },
  };
}

/**
 * 学習状態を読込（history.json + localStorage 上書き）
 */
export async function loadLearningState() {
  if (cachedState) return cloneState(cachedState);

  let base;
  try {
    base = await loadJson("history");
  } catch (error) {
    if (DEBUG_MODE) {
      console.warn(`[${AI_NAME}] history.json 読込失敗。空の学習状態を使用`, error);
    }
    base = emptyHistory();
  }

  const overlay = readLocalOverlay();
  const state = mergeHistory(base, overlay);
  state.metrics = recomputeMetrics(state.records);
  cachedState = state;
  return cloneState(state);
}

/** 補正値のみ取得 */
export async function getCorrections() {
  const state = await loadLearningState();
  return state.corrections || createDefaultCorrections();
}

/** 学習指標 */
export async function getLearningMetrics() {
  const state = await loadLearningState();
  return state.metrics || emptyMetrics();
}

/**
 * レース結果を学習へ反映
 * @param {object} input
 *   race: { venueLabel, number, track, distance, trackCondition, name }
 *   results: [{ number, finish, popularity, payout }]
 *   prediction?: { topNumbers, indexes }
 *   stake?: number
 */
export async function learnFromResult(input) {
  const state = await loadLearningState();
  const record = buildRecord(input, state);
  state.records = [record, ...(state.records || [])].slice(0, 200);
  state.corrections = updateCorrections(state.corrections, record, input);
  state.insights = updateInsights(state.insights || [], record);
  state.metrics = recomputeMetrics(state.records);
  state.updatedAt = formatDateTime();

  // 思考エンジン重みも低学習率で更新
  const thinkingWeights = learnThinkingWeights(record, LEARNING_RATE);
  state.thinkingWeights = thinkingWeights;

  persistState(state);
  cachedState = state;

  if (DEBUG_MODE) {
    console.log(`[${AI_NAME}] learned`, record.id, state.metrics, state.corrections);
  }

  return {
    record,
    corrections: state.corrections,
    metrics: state.metrics,
    insights: state.insights,
  };
}

/**
 * 同条件の学習インサイト（コメント用）
 */
export function getLearningInsights(race, state) {
  const insights = state?.insights || [];
  const key = conditionKey(race);
  const exact = insights.find((item) => item.conditionKey === key);
  const similar = insights
    .filter((item) => item.conditionKey !== key)
    .filter((item) => similarCondition(item.conditionKey, race))
    .sort((a, b) => b.roi - a.roi);

  const lines = [];
  if (exact && exact.races >= 2) {
    if (exact.roi >= 110) {
      lines.push(`過去同条件で好成績（回収率${Math.round(exact.roi)}%）`);
    } else if (exact.hits / Math.max(1, exact.races) >= 0.5) {
      lines.push("過去同条件で的中率が高めです");
    } else {
      lines.push(`同条件の学習済みレースは${exact.races}件です`);
    }
  }

  const best = exact?.roi >= 110 ? exact : similar[0];
  if (best && best.roi >= 110) {
    lines.push(
      `今回と似た条件で回収率${Math.round(best.roi)}%（${best.label || best.conditionKey}）`
    );
  }

  const metrics = state?.metrics;
  if (metrics?.aiRoi >= 110) {
    lines.push(`当AIでは高回収条件（AI回収率${Number(metrics.aiRoi).toFixed(1)}%）`);
  }

  if (metrics?.indexAvgError != null && metrics.indexAvgError <= 30) {
    lines.push(`指数平均誤差は${Number(metrics.indexAvgError).toFixed(1)}で安定しています`);
  }

  return {
    lines,
    exact,
    similar: similar.slice(0, 3),
    conditionKey: key,
  };
}

/** プロンプト入力で学習（HTML追加なし） */
export async function promptAndLearn(defaults = {}) {
  const raceLine = window.prompt(
    "学習するレース条件を入力\n形式: 開催地,芝/ダート,距離,馬場\n例: 東京,芝,1600,良",
    defaults.raceHint || "東京,芝,1600,良"
  );
  if (raceLine == null) return null;

  const resultLine = window.prompt(
    "着順・人気・配当を入力\n形式: 馬番:着順:人気:配当, ...\n例: 1:1:1:280,5:2:4:0,2:3:3:0",
    defaults.resultHint || "1:1:1:280,5:2:4:0,2:3:3:0"
  );
  if (resultLine == null) return null;

  const race = parseRaceLine(raceLine, defaults.race || {});
  const results = parseResultLine(resultLine);
  if (!results.length) {
    window.alert("着順データの形式が正しくありません");
    return null;
  }

  const stakeRaw = window.prompt("購入金額（円）", String(defaults.stake || 1000));
  const stake = Math.max(0, Number(stakeRaw) || 1000);

  const learned = await learnFromResult({
    race,
    results,
    prediction: defaults.prediction || loadLastPrediction()?.prediction || null,
    stake,
  });

  window.alert(
    `学習を反映しました\nAI回収率 ${learned.metrics.aiRoi}%\nAI的中率 ${learned.metrics.aiHitRate}%\n指数平均誤差 ${learned.metrics.indexAvgError}`
  );
  return learned;
}

/** localStorage の学習上書きを削除 */
export function clearLearningOverlay() {
  try {
    localStorage.removeItem(LEARNING_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  cachedState = null;
}

/** コンソール / 外部連携用 */
export function exposeLearningApi(target = window) {
  target.PAPAPA_LEARN = {
    learnFromResult,
    promptAndLearn,
    loadLearningState,
    getLearningMetrics,
    getCorrections,
    clearLearningOverlay,
    saveLastPrediction,
    loadLastPrediction,
  };
}

const LAST_PREDICTION_KEY = "papapa_iq_last_prediction_v1";

/** 直近予想を保存（結果学習時に利用） */
export function saveLastPrediction(payload) {
  try {
    localStorage.setItem(LAST_PREDICTION_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function loadLastPrediction() {
  try {
    const raw = localStorage.getItem(LAST_PREDICTION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ---------- internal ---------- */

function emptyHistory() {
  return {
    version: "1.0.0",
    updatedAt: formatDateTime(),
    corrections: createDefaultCorrections(),
    metrics: emptyMetrics(),
    insights: [],
    records: [],
  };
}

function emptyMetrics() {
  return {
    aiRoi: 100,
    aiHitRate: 0,
    indexAvgError: 0,
    evAverage: INDEX_BASE,
    racesLearned: 0,
    totalStake: 0,
    totalPayout: 0,
  };
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function readLocalOverlay() {
  try {
    const raw = localStorage.getItem(LEARNING_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistState(state) {
  const payload = {
    version: state.version || "1.0.0",
    updatedAt: state.updatedAt,
    corrections: state.corrections,
    metrics: state.metrics,
    insights: state.insights,
    records: state.records,
  };
  try {
    localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    if (DEBUG_MODE) console.warn(`[${AI_NAME}] learning save failed`, error);
  }
}

function mergeHistory(base, overlay) {
  if (!overlay) {
    return {
      ...emptyHistory(),
      ...base,
      corrections: {
        ...createDefaultCorrections(),
        ...(base.corrections || {}),
        weights: {
          ...createDefaultCorrections().weights,
          ...(base.corrections?.weights || {}),
        },
        indexWeight: {
          ...createDefaultCorrections().indexWeight,
          ...(base.corrections?.indexWeight || {}),
        },
        indexOffsets: {
          ...createDefaultCorrections().indexOffsets,
          ...(base.corrections?.indexOffsets || {}),
        },
      },
    };
  }

  const baseRecords = Array.isArray(base.records) ? base.records : [];
  const overlayRecords = Array.isArray(overlay.records) ? overlay.records : [];
  const byId = new Map();
  [...baseRecords, ...overlayRecords].forEach((record) => {
    if (record?.id) byId.set(record.id, record);
  });

  return {
    version: overlay.version || base.version || "1.0.0",
    updatedAt: overlay.updatedAt || base.updatedAt,
    corrections: {
      ...createDefaultCorrections(),
      ...(base.corrections || {}),
      ...(overlay.corrections || {}),
      weights: {
        ...createDefaultCorrections().weights,
        ...(base.corrections?.weights || {}),
        ...(overlay.corrections?.weights || {}),
      },
      indexWeight: {
        ...createDefaultCorrections().indexWeight,
        ...(base.corrections?.indexWeight || {}),
        ...(overlay.corrections?.indexWeight || {}),
      },
      indexOffsets: {
        ...createDefaultCorrections().indexOffsets,
        ...(base.corrections?.indexOffsets || {}),
        ...(overlay.corrections?.indexOffsets || {}),
      },
    },
    insights: mergeInsights(base.insights || [], overlay.insights || []),
    records: Array.from(byId.values()).sort((a, b) =>
      String(b.date).localeCompare(String(a.date))
    ),
    metrics: overlay.metrics || base.metrics || emptyMetrics(),
  };
}

function mergeInsights(a, b) {
  const map = new Map();
  [...a, ...b].forEach((item) => {
    if (!item?.conditionKey) return;
    const prev = map.get(item.conditionKey);
    if (!prev || (item.races || 0) >= (prev.races || 0)) {
      map.set(item.conditionKey, item);
    }
  });
  return Array.from(map.values());
}

function buildRecord(input, state) {
  const race = input.race || {};
  const results = (input.results || [])
    .map((item) => ({
      number: Number(item.number),
      finish: Number(item.finish),
      popularity: Number(item.popularity) || 99,
      payout: Number(item.payout) || 0,
    }))
    .sort((a, b) => a.finish - b.finish);

  const stake = Number(input.stake) || 1000;
  const winPayout = results.find((item) => item.finish === 1)?.payout || 0;
  const payout =
    Number(input.payout) ||
    (winPayout > 0 ? Math.round((winPayout / 100) * stake) : 0);

  const prediction = input.prediction || inferPredictionFromState(results, state);
  const hit = isHit(prediction?.topNumbers || [], results);
  const indexError = calcIndexError(prediction?.indexes || {}, results);

  return {
    id: `learn-${Date.now()}`,
    date: formatDateTime(),
    race: {
      venueLabel: race.venueLabel || race.venue || "",
      number: Number(race.number) || 0,
      track: race.track || "芝",
      distance: Number(race.distance) || 1600,
      trackCondition: race.trackCondition || "良",
      name: race.name || "",
    },
    results,
    prediction,
    learning: {
      hit,
      stake,
      payout,
      roi: stake > 0 ? Math.round((payout / stake) * 1000) / 10 : 0,
      indexError,
    },
  };
}

function inferPredictionFromState(results, state) {
  // 予測が無い場合は人気上位を仮予測として誤差計算を弱める
  const byPop = [...results].sort((a, b) => a.popularity - b.popularity);
  return {
    topNumbers: byPop.slice(0, 3).map((item) => item.number),
    indexes: Object.fromEntries(
      results.map((item) => [
        String(item.number),
        Math.round(INDEX_BASE + (10 - item.popularity) * 25),
      ])
    ),
  };
}

function isHit(topNumbers, results) {
  const finishTop = results
    .filter((item) => item.finish >= 1 && item.finish <= 3)
    .map((item) => item.number);
  return topNumbers.slice(0, 3).some((num) => finishTop.includes(num));
}

function calcIndexError(indexes, results) {
  const entries = Object.entries(indexes);
  if (!entries.length || !results.length) return 40;

  const ranked = entries
    .map(([number, index]) => ({ number: Number(number), index: Number(index) }))
    .sort((a, b) => b.index - a.index);

  let total = 0;
  let count = 0;
  results.forEach((result) => {
    const predRank = ranked.findIndex((item) => item.number === result.number);
    if (predRank < 0) return;
    total += Math.abs(predRank + 1 - result.finish) * 12;
    count += 1;
  });
  return count ? Math.round((total / count) * 10) / 10 : 40;
}

/**
 * 結果から重み・補正を自動調整
 */
function updateCorrections(prev, record, input) {
  const next = {
    ...createDefaultCorrections(),
    ...(prev || {}),
    weights: { ...createDefaultCorrections().weights, ...(prev?.weights || {}) },
    indexWeight: {
      ...createDefaultCorrections().indexWeight,
      ...(prev?.indexWeight || {}),
    },
    indexOffsets: {
      ...createDefaultCorrections().indexOffsets,
      ...(prev?.indexOffsets || {}),
    },
  };

  const lr = LEARNING_RATE;
  const winner = (record.results || []).find((item) => item.finish === 1);
  const hit = record.learning?.hit;
  const indexError = record.learning?.indexError || 40;
  const winPop = winner?.popularity || 99;

  // 期待値・人気ギャップ
  if (winPop >= 5) {
    next.weights.value = clamp(next.weights.value + lr * 0.15, 0.6, 1.6);
    next.evBoost = clamp(next.evBoost + lr * 0.08, 0.7, 1.4);
    next.indexWeight.expectedValue = normalizeWeight(
      next.indexWeight.expectedValue + lr * 0.02,
      next.indexWeight,
      "expectedValue"
    );
  } else if (winPop <= 2 && !hit) {
    next.weights.value = clamp(next.weights.value + lr * 0.05, 0.6, 1.6);
    next.indexOffsets.expectedValue += Math.round(lr * 8);
  }

  // 指数誤差が大きい → 安定/適性を強化
  if (indexError >= 45) {
    next.indexWeight.stability = normalizeWeight(
      next.indexWeight.stability + lr * 0.015,
      next.indexWeight,
      "stability"
    );
    next.indexWeight.aptitude = normalizeWeight(
      next.indexWeight.aptitude + lr * 0.015,
      next.indexWeight,
      "aptitude"
    );
  } else if (indexError <= 25) {
    next.indexOffsets.total += Math.round(lr * 4);
  }

  // 展開・馬場・距離補正
  const race = record.race || input.race || {};
  if (race.trackCondition && race.trackCondition !== "良") {
    next.trackBoost = clamp(next.trackBoost + lr * 0.06, 0.7, 1.4);
    next.weights.track = clamp(next.weights.track + lr * 0.08, 0.6, 1.5);
  } else {
    next.trackBoost = clamp(next.trackBoost + lr * 0.01, 0.7, 1.4);
  }

  if (Number(race.distance) >= 2000) {
    next.distanceBoost = clamp(next.distanceBoost + lr * 0.05, 0.7, 1.4);
    next.weights.distance = clamp(next.weights.distance + lr * 0.06, 0.6, 1.5);
    next.indexOffsets.stamina += Math.round(lr * 6);
  } else if (Number(race.distance) <= 1400) {
    next.indexOffsets.burst += Math.round(lr * 6);
    next.indexOffsets.speed += Math.round(lr * 4);
  } else {
    next.paceBoost = clamp(next.paceBoost + lr * 0.04, 0.7, 1.4);
    next.indexOffsets.pace += Math.round(lr * 5);
  }

  if (hit) {
    next.weights.speed = clamp(next.weights.speed + lr * 0.03, 0.6, 1.5);
  } else {
    next.paceBoost = clamp(next.paceBoost + lr * 0.05, 0.7, 1.4);
    next.indexWeight.pace = normalizeWeight(
      next.indexWeight.pace + lr * 0.02,
      next.indexWeight,
      "pace"
    );
  }

  // 指数オフセットの範囲制限
  Object.keys(next.indexOffsets).forEach((key) => {
    next.indexOffsets[key] = clamp(next.indexOffsets[key], -80, 80);
  });

  // indexWeight 正規化
  next.indexWeight = renormalizeIndexWeight(next.indexWeight);
  return next;
}

function normalizeWeight(value, weights, key) {
  const next = { ...weights, [key]: value };
  return renormalizeIndexWeight(next)[key];
}

function renormalizeIndexWeight(weights) {
  const keys = Object.keys(INDEX_WEIGHT);
  const safe = {};
  keys.forEach((key) => {
    safe[key] = Math.max(0.05, Number(weights[key]) || INDEX_WEIGHT[key]);
  });
  const sum = keys.reduce((acc, key) => acc + safe[key], 0) || 1;
  const out = {};
  keys.forEach((key) => {
    out[key] = Math.round((safe[key] / sum) * 1000) / 1000;
  });
  return out;
}

function updateInsights(insights, record) {
  const key = conditionKey(record.race);
  const label = conditionLabel(record.race);
  const list = [...insights];
  const idx = list.findIndex((item) => item.conditionKey === key);
  const hit = record.learning?.hit ? 1 : 0;
  const roi = record.learning?.roi || 0;
  const err = record.learning?.indexError || 40;

  if (idx >= 0) {
    const prev = list[idx];
    const races = (prev.races || 0) + 1;
    const hits = (prev.hits || 0) + hit;
    list[idx] = {
      ...prev,
      label,
      races,
      hits,
      roi: Math.round(((prev.roi || 100) * (races - 1) + roi) / races),
      avgIndexError: Math.round((((prev.avgIndexError || 40) * (races - 1) + err) / races) * 10) / 10,
    };
  } else {
    list.push({
      conditionKey: key,
      label,
      races: 1,
      hits: hit,
      roi,
      avgIndexError: err,
    });
  }

  return list.sort((a, b) => b.roi - a.roi).slice(0, 50);
}

function recomputeMetrics(records = []) {
  if (!records.length) return emptyMetrics();

  let stake = 0;
  let payout = 0;
  let hits = 0;
  let errorSum = 0;
  let evSum = 0;
  let evCount = 0;

  records.forEach((record) => {
    const learning = record.learning || {};
    stake += Number(learning.stake) || 0;
    payout += Number(learning.payout) || 0;
    if (learning.hit) hits += 1;
    errorSum += Number(learning.indexError) || 0;

    const indexes = record.prediction?.indexes || {};
    Object.values(indexes).forEach((value) => {
      evSum += Number(value) || 0;
      evCount += 1;
    });
  });

  return {
    aiRoi: stake > 0 ? Math.round((payout / stake) * 1000) / 10 : 100,
    aiHitRate: Math.round((hits / records.length) * 1000) / 10,
    indexAvgError: Math.round((errorSum / records.length) * 10) / 10,
    evAverage: evCount ? Math.round(evSum / evCount) : INDEX_BASE,
    racesLearned: records.length,
    totalStake: stake,
    totalPayout: payout,
  };
}

function conditionKey(race = {}) {
  const venue = race.venueLabel || race.venue || "unknown";
  const track = race.track || "芝";
  const distance = Number(race.distance) || 1600;
  const condition = race.trackCondition || "良";
  return `${venue}|${track}|${distance}|${condition}`;
}

function conditionLabel(race = {}) {
  return `${race.venueLabel || race.venue || ""}${race.track || "芝"}${race.distance || ""}${race.trackCondition || "良"}`;
}

function similarCondition(key, race) {
  const parts = String(key).split("|");
  if (parts.length < 4) return false;
  const track = race.track || "芝";
  const distance = Number(race.distance) || 1600;
  const condition = race.trackCondition || "良";
  return (
    parts[1] === track &&
    Math.abs(Number(parts[2]) - distance) <= 400 &&
    (parts[3] === condition || condition === "良")
  );
}

function parseRaceLine(line, fallback = {}) {
  const parts = String(line)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    venueLabel: parts[0] || fallback.venueLabel || "東京",
    track: parts[1] || fallback.track || "芝",
    distance: Number(parts[2]) || fallback.distance || 1600,
    trackCondition: parts[3] || fallback.trackCondition || "良",
    number: fallback.number || 11,
    name: fallback.name || "学習レース",
  };
}

function parseResultLine(line) {
  return String(line)
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [number, finish, popularity, payout] = chunk.split(":").map((v) => v.trim());
      return {
        number: Number(number),
        finish: Number(finish),
        popularity: Number(popularity) || 99,
        payout: Number(payout) || 0,
      };
    })
    .filter((item) => item.number > 0 && item.finish > 0);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
