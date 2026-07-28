/* ========================================
   RaceReviewEngine — Ver6.5
   AI Race Review & Knowledge Learning オーケストレータ
   ======================================== */

import { analyzeWinner, WinnerAnalyzer } from "./winner-analyzer.js";
import { analyzeLosers, LoserAnalyzer } from "./loser-analyzer.js";
import { analyzeRaceFlow, RaceFlowAnalyzer } from "./race-flow-analyzer.js";
import { generateLessons, LessonGenerator } from "./lesson-generator.js";
import {
  buildFutureWatch,
  FuturePredictionManager,
} from "./future-prediction-manager.js";
import {
  KnowledgeManager,
  REVIEW_VERSION,
  createKnowledgeRecord,
  loadKnowledgeBase,
  saveKnowledgeBase,
  upsertReview,
  appendLessons,
  appendHorseMemo,
  mergeFutureWatch,
  appendHistory,
  getKnowledgeStats,
} from "./knowledge-manager.js";
import { explainReview, ExplainReview } from "./explain-review.js";
import { buildHorseMemos } from "./horse-memo.js";
import {
  loadReviewSources,
  integrateSources,
} from "./review-sources.js";
import {
  buildLearningHandoff,
  toLearningCompatibleNotes,
} from "./learning-bridge.js";
import { sortByFinish, toNum } from "./utils.js";

export {
  WinnerAnalyzer,
  LoserAnalyzer,
  RaceFlowAnalyzer,
  LessonGenerator,
  FuturePredictionManager,
  KnowledgeManager,
  ExplainReview,
  REVIEW_VERSION,
};

/**
 * レースレビューを実行し Knowledge Base へ蓄積
 * @param {object} input
 * @param {object} input.race
 * @param {array} input.entries - { number, name, finish, popularity, ... }
 * @param {object} [input.prediction]
 * @param {object} [input.sources] - 事前統合済みソース
 * @param {object} [input.learningDiff]
 * @param {boolean} [input.persist=true]
 */
export async function runRaceReview(input = {}) {
  const race = input.race || {};
  const entries = normalizeEntries(input.entries || input.results || []);
  const prediction = input.prediction || {};
  const learningDiff = input.learningDiff || null;

  const sources =
    input.sources ||
    (await loadReviewSources(race)) ||
    integrateSources({}, race);

  const raceId =
    input.raceId ||
    sources.raceId ||
    race.id ||
    `${race.venueLabel || "race"}-${race.number || "x"}-${race.date || ""}`;

  const sorted = sortByFinish(entries);
  const winner = sorted.find((e) => toNum(e.finish, 99) === 1) || sorted[0];

  const raceFlow = analyzeRaceFlow({
    race: { ...race, id: raceId },
    entries,
    sources,
    prediction,
    learningDiff,
  });

  const winnerAnalysis = analyzeWinner({
    winner,
    race,
    sources,
    prediction,
  });

  const loserAnalysis = analyzeLosers({
    entries,
    race,
    sources,
    prediction,
  });

  const lessons = generateLessons({
    raceFlow,
    winnerAnalysis,
    loserAnalysis,
    sources,
    predictionGap: raceFlow.predictionGap,
  });

  const futureWatch = buildFutureWatch({
    entries,
    winnerAnalysis,
    loserAnalysis,
    raceFlow,
    sources,
  });

  const horseMemos = buildHorseMemos({
    entries,
    winnerAnalysis,
    loserAnalysis,
    raceFlow,
    raceId,
  });

  const bundle = {
    version: REVIEW_VERSION,
    raceId,
    race,
    entries,
    sources: {
      sourceCount: sources.sourceCount,
      policy: sources.policy,
      lap: sources.lap,
      track: sources.track,
      weather: sources.weather,
      marketX: sources.marketX,
      // 本文は含めない
    },
    raceFlow,
    winnerAnalysis,
    loserAnalysis,
    lessons,
    futureWatch,
    horseMemos,
  };

  bundle.explainReview = explainReview(bundle);
  bundle.learningPayload = buildLearningHandoff(bundle);
  bundle.learningNotes = toLearningCompatibleNotes(bundle.learningPayload);

  const record = createKnowledgeRecord({
    id: input.recordId || `rv_${raceId}`.replace(/\s+/g, "_"),
    raceId,
    horseId: winnerAnalysis.horseId,
    review: {
      overview: raceFlow.overview,
      development: raceFlow.development,
      pace: raceFlow.pace,
      track: raceFlow.track,
      popularity: raceFlow.popularity,
      marketPsych: raceFlow.marketPsych,
      predictionGap: raceFlow.predictionGap,
    },
    lessons: lessons.items,
    winnerAnalysis,
    loserAnalysis,
    futureWatch,
    learningPayload: bundle.learningPayload,
    timestamp: input.timestamp || new Date().toISOString(),
  });

  let kb = null;
  if (input.persist !== false) {
    kb = persistReview(record, lessons.items, horseMemos, futureWatch, raceId);
  }

  return {
    ...bundle,
    record,
    knowledgeStats: kb ? getKnowledgeStats(kb) : null,
    dashboard: buildDashboardSlice(record, lessons, futureWatch, kb),
  };
}

function persistReview(record, lessonItems, horseMemos, futureWatch, raceId) {
  let kb = loadKnowledgeBase();
  kb = upsertReview(kb, record);
  kb = appendLessons(kb, lessonItems, raceId);
  for (const memo of horseMemos || []) {
    kb = appendHorseMemo(kb, memo.horseId, memo);
  }
  kb = mergeFutureWatch(kb, futureWatch);
  kb = appendHistory(kb, {
    type: "race_review",
    message: record.review?.overview?.summary || "レースレビューを保存",
    raceId,
    meta: { version: REVIEW_VERSION },
  });
  return saveKnowledgeBase(kb);
}

function buildDashboardSlice(record, lessons, futureWatch, kb) {
  return {
    latestReview: {
      raceId: record.raceId,
      summary: record.review?.overview?.summary || "",
      tone: record.review?.overview?.tone || "",
      timestamp: record.timestamp,
    },
    lessons: (lessons?.items || []).slice(0, 6),
    nextWatch: (futureWatch?.nextWatch || []).slice(0, 5),
    dangerFavorites: (futureWatch?.dangerFavorites || []).slice(0, 5),
    stats: kb ? getKnowledgeStats(kb) : null,
  };
}

function normalizeEntries(list) {
  return (list || []).map((e, i) => ({
    ...e,
    number: e.number ?? e.horseNumber ?? i + 1,
    name: e.name || e.horse || `馬${e.number ?? i + 1}`,
    finish: toNum(e.finish, e.rank ?? 99),
    popularity: toNum(e.popularity, 99),
    horseId: e.horseId || e.id || e.number || i + 1,
  }));
}

export const RaceReviewEngine = {
  run: runRaceReview,
  version: REVIEW_VERSION,
};
