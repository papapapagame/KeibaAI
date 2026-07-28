/* ========================================
   Unified Race Model — Ver7.0
   全AIはこのモデルのみを参照する
   ======================================== */

import { toNum, toStr } from "./utils.js";

export const UNIFIED_MODEL_VERSION = "7.0.0";

/** 表面・距離の表記ゆれを統一 → 例: 芝1600m */
export function normalizeSurfaceDistance(surface, distance) {
  const surf = normalizeSurface(surface);
  const dist = normalizeDistance(distance);
  if (!dist) return surf || "";
  return `${surf}${dist}m`;
}

export function normalizeSurface(raw) {
  const s = toStr(raw).toLowerCase();
  if (!s) return "芝";
  if (s.includes("ダート") || s.includes("dirt") || s === "ダ" || s === "d") {
    return "ダート";
  }
  if (s.includes("芝") || s.includes("turf") || s === "t") return "芝";
  if (s.includes("障害") || s.includes("障")) return "障害";
  return toStr(raw, "芝");
}

export function normalizeDistance(raw) {
  if (raw == null || raw === "") return 0;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.round(raw);
  const text = String(raw).replace(/,/g, "");
  const m = text.match(/(\d{3,4})\s*m?/i);
  if (m) return Number(m[1]);
  const n = Number(text);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function createJockeyModel(raw = {}) {
  return {
    jockeyId: raw.jockeyId || raw.id || null,
    name: toStr(raw.name || raw.jockey),
    winRate: toNum(raw.winRate),
    placeRate: toNum(raw.placeRate),
  };
}

export function createTrainerModel(raw = {}) {
  return {
    trainerId: raw.trainerId || raw.id || null,
    name: toStr(raw.name || raw.trainer),
    winRate: toNum(raw.winRate),
    placeRate: toNum(raw.placeRate),
  };
}

export function createOddsModel(raw = {}) {
  return {
    win: toNum(raw.win ?? raw.odds),
    place: toNum(raw.place),
    popularity: toNum(raw.popularity, 99),
    updatedAt: raw.updatedAt || null,
  };
}

export function createResultModel(raw = {}) {
  return {
    finish: raw.finish != null ? toNum(raw.finish) : null,
    time: toStr(raw.time),
    margin: toStr(raw.margin),
    last3f: raw.last3f != null ? toNum(raw.last3f) : null,
  };
}

export function createMarketModel(raw = {}) {
  return {
    heat: toNum(raw.heat, 50),
    sentiment: toStr(raw.sentiment, "neutral"),
    overheat: Boolean(raw.overheat),
    summary: toStr(raw.summary),
  };
}

export function createReviewRef(raw = {}) {
  return {
    reviewId: raw.reviewId || raw.id || null,
    raceId: raw.raceId || null,
    summary: toStr(raw.summary),
  };
}

export function createLearningRef(raw = {}) {
  return {
    learningId: raw.learningId || raw.id || null,
    raceId: raw.raceId || null,
    hit: raw.hit == null ? null : Boolean(raw.hit),
  };
}

export function createKnowledgeRef(raw = {}) {
  return {
    knowledgeId: raw.knowledgeId || raw.id || null,
    raceId: raw.raceId || null,
    horseId: raw.horseId || null,
  };
}

/**
 * Horse（統一）
 * AI互換のため horse / last3 等も併記
 */
export function createHorseModel(raw = {}) {
  const number = toNum(raw.number);
  const horseName = toStr(raw.horseName || raw.horse || raw.name);
  const jockey =
    typeof raw.jockey === "object"
      ? createJockeyModel(raw.jockey)
      : createJockeyModel({ name: raw.jockey });
  const trainer =
    typeof raw.trainer === "object"
      ? createTrainerModel(raw.trainer)
      : createTrainerModel({ name: raw.trainer });
  const odds = createOddsModel({
    win: typeof raw.odds === "object" ? raw.odds?.win : raw.odds,
    place: typeof raw.odds === "object" ? raw.odds?.place : raw.place,
    popularity:
      raw.popularity ??
      (typeof raw.odds === "object" ? raw.odds?.popularity : undefined),
    updatedAt: typeof raw.odds === "object" ? raw.odds?.updatedAt : null,
  });
  const lastResults = normalizeLastResults(raw.lastResults || raw.last3);

  return {
    horseId: raw.horseId || raw.id || `H${String(number).padStart(2, "0")}`,
    horseName,
    frame: toNum(raw.frame),
    number,
    jockey,
    trainer,
    weight: toNum(raw.weight, 55),
    weightChange: toNum(raw.weightChange),
    sex: toStr(raw.sex),
    age: toNum(raw.age),
    runningStyle: toStr(raw.runningStyle, "差し"),
    odds,
    popularity: odds.popularity,
    lastResults,
    result: raw.result ? createResultModel(raw.result) : null,
    score: raw.score != null ? toNum(raw.score) : toNum(raw.stars),

    // AIエンジン互換（既存ロジック変更なし）
    horse: horseName,
    last3: lastResults,
    lastRace: toStr(raw.lastRace),
    favorite: Boolean(raw.favorite),
    trackType: toStr(raw.trackType),
    distanceType: toStr(raw.distanceType),
    winRate: toNum(raw.winRate),
    placeRate: toNum(raw.placeRate),
    grade: toStr(raw.grade),
    stars: toNum(raw.stars || raw.score),
  };
}

/**
 * Race（統一）
 */
export function createRaceModel(raw = {}, horses = []) {
  const number = toNum(raw.number || raw.raceNumber);
  const surface = normalizeSurface(raw.surface || raw.track);
  const distance = normalizeDistance(raw.distance);
  const course = toStr(raw.course || raw.venueLabel || raw.venue);
  const horseModels = (horses || []).map((h) => createHorseModel(h));

  return {
    modelVersion: UNIFIED_MODEL_VERSION,
    raceId:
      raw.raceId ||
      `${raw.date || "nodate"}_${raw.venue || "venue"}_${number}`,
    course,
    raceName: toStr(raw.raceName || raw.name),
    distance,
    surface,
    surfaceDistance: normalizeSurfaceDistance(surface, distance),
    weather: toStr(raw.weather),
    trackCondition: toStr(raw.trackCondition, "良"),
    startTime: toStr(raw.startTime || raw.time),
    horses: horseModels,
    market: raw.market ? createMarketModel(raw.market) : null,
    review: raw.review ? createReviewRef(raw.review) : null,
    learning: raw.learning ? createLearningRef(raw.learning) : null,
    knowledge: raw.knowledge ? createKnowledgeRef(raw.knowledge) : null,

    // AIエンジン互換
    date: toStr(raw.date),
    venue: toStr(raw.venue),
    venueLabel: toStr(raw.venueLabel || course),
    number,
    name: toStr(raw.raceName || raw.name),
    time: toStr(raw.startTime || raw.time),
    track: surface,
    courseDirection: toStr(raw.courseDirection),
    fieldSize: toNum(raw.fieldSize, horseModels.length),
    pacePrediction: toStr(raw.pacePrediction),
    grade: toStr(raw.grade),
  };
}

export function toLegacyRace(race) {
  if (!race) return null;
  return {
    ...race,
    track: race.surface || race.track,
    venueLabel: race.venueLabel || race.course,
  };
}

export function toLegacyHorses(horses) {
  return (horses || []).map((h) => ({
    ...h,
    horse: h.horseName || h.horse,
    jockey: typeof h.jockey === "object" ? h.jockey.name : h.jockey,
    trainer: typeof h.trainer === "object" ? h.trainer.name : h.trainer,
    odds: typeof h.odds === "object" ? h.odds.win : h.odds,
    popularity: h.popularity ?? (typeof h.odds === "object" ? h.odds.popularity : 99),
    last3: h.lastResults || h.last3 || [],
  }));
}

function normalizeLastResults(list) {
  if (!Array.isArray(list)) return [];
  return list.map((r) => {
    if (typeof r === "number") return r;
    if (r && typeof r === "object") return toNum(r.finish ?? r.rank, 0);
    return toNum(r, 0);
  });
}
