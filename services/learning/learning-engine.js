/* ========================================
   Learning Engine (services) — Ver5.5
   自己学習基盤オーケストレータ
   ※ js/learning-engine.js / ai-engine / thinking-engine は変更しない
   ※ 予想ロジックの自動書換は禁止（蓄積・分析・重み管理・提案のみ）
   ======================================== */

import {
  createLearningRecord,
  loadLearningDatabase,
  saveLearningDatabase,
  clearLearningDatabase,
  LEARNING_VERSION,
} from "./learning-db.js";
import { analyzeRaceResult } from "./result-analyzer.js";
import { trackAnalyzerAccuracy } from "./accuracy-tracker.js";
import { analyzePerformance } from "./performance-analyzer.js";
import {
  appendHistoryEvent,
  buildImprovementPoints,
  listRecentLearning,
} from "./learning-history.js";
import {
  loadWeights,
  saveWeights,
  resetWeights,
  proposeWeights,
} from "./weight-optimizer.js";
import { explainLearning } from "./explain-learning.js";
import { AI_VERSION, VERSION } from "../../js/config.js";
import { ensureDemoLearningData } from "./seed-demo.js";

/**
 * 予想時点のスナップショットを保存（結果未確定）
 */
export function recordPrediction(input = {}) {
  let db = loadLearningDatabase();
  const record = createLearningRecord({
    race: input.race || {},
    prediction: {
      topNumbers: input.topNumbers || [],
      rankedNumbers: input.rankedNumbers || input.topNumbers || [],
      topPopularity: input.topPopularity ?? null,
    },
    analyzerSnapshot: input.analyzerSnapshot || {},
    scores: input.scores || {},
    result: null,
    diff: null,
    engineVersion: AI_VERSION,
  });
  db.records = [record, ...(db.records || [])].slice(0, 200);
  db = appendHistoryEvent(db, {
    type: "prediction",
    message: `予想を保存: ${labelRace(record.race)}`,
    raceId: record.id,
  });
  saveLearningDatabase(db);
  return record;
}

/**
 * レース結果を登録し、差分学習（ロジックは書き換えない）
 */
export function learnFromResult(recordId, result = {}) {
  let db = loadLearningDatabase();
  const idx = (db.records || []).findIndex((r) => r.id === recordId);
  if (idx < 0) {
    throw new Error("Learning record not found");
  }
  const prev = db.records[idx];
  const analyzed = analyzeRaceResult(prev.prediction, result, {});
  const tempRecords = db.records.map((r, i) =>
    i === idx
      ? {
          ...r,
          result: { ...analyzed.resultSummary, ...result },
          diff: analyzed.diff,
        }
      : r
  );
  const analyzerStats = trackAnalyzerAccuracy(tempRecords);
  const explain = explainLearning(
    analyzed.diff,
    { ...analyzed.resultSummary, ...result },
    analyzerStats
  );

  const next = {
    ...prev,
    result: {
      ...analyzed.resultSummary,
      ...result,
      stake: result.stake || analyzed.resultSummary.stake,
      payout: result.payout != null ? result.payout : analyzed.resultSummary.payout,
    },
    diff: analyzed.diff,
    metrics: { roi: analyzed.roi },
    explain,
    learningVersion: LEARNING_VERSION,
    engineVersion: AI_VERSION,
    appVersion: VERSION,
    timestamp: new Date().toISOString(),
  };

  db.records[idx] = next;
  db = appendHistoryEvent(db, {
    type: "learn",
    message: explain.summary,
    raceId: next.id,
    meta: { hit: analyzed.diff.hitPlace, roi: analyzed.roi },
  });
  saveLearningDatabase(db);

  // 重みは提案のみ（自動適用しない）
  const proposal = proposeWeights(analyzerStats, loadWeights());

  return {
    record: next,
    analyzerStats,
    weightProposal: proposal,
    explain,
  };
}

/**
 * デモ／手動で予測+結果を一括投入
 */
export function ingestClosedRace(input = {}) {
  const pred = recordPrediction(input);
  return learnFromResult(pred.id, input.result || {});
}

export function getLearningDashboard(options = {}) {
  let db = loadLearningDatabase();
  if (options.ensureDemo !== false) {
    db = ensureDemoLearningData(db);
  }
  const records = db.records || [];
  const performance = analyzePerformance(records);
  const analyzerStats = trackAnalyzerAccuracy(records);
  const weights = loadWeights();
  const weightProposal = proposeWeights(analyzerStats, weights);
  const recent = listRecentLearning(records, 8);
  const improvements = buildImprovementPoints(analyzerStats, performance);
  const accuracySeries = buildAccuracySeries(records);

  return {
    dbMeta: {
      schemaVersion: db.schemaVersion,
      engineVersion: db.engineVersion,
      learningVersion: db.learningVersion || LEARNING_VERSION,
      appVersion: db.appVersion || VERSION,
      updatedAt: db.updatedAt,
      recordCount: records.length,
    },
    performance,
    analyzerStats,
    weights,
    weightProposal,
    recent,
    improvements,
    accuracySeries,
    history: (db.history || []).slice(0, 20),
    policy: {
      autoRewriteForbidden: true,
      weightAutoApply: false,
      targetVersionForApply: "6.0.0",
    },
  };
}

export function updateAnalyzerWeights(weights) {
  return saveWeights(weights);
}

export function resetAnalyzerWeights() {
  return resetWeights();
}

export function resetLearningAiData() {
  clearLearningDatabase();
  resetWeights();
  return getLearningDashboard({ ensureDemo: true });
}

function buildAccuracySeries(records) {
  const closed = records.filter((r) => r?.result && r?.diff);
  const out = [];
  let hits = 0;
  for (let i = 0; i < closed.length; i += 1) {
    if (closed[i].diff.hitPlace || closed[i].diff.hitWin) hits += 1;
    out.push({
      index: i + 1,
      accuracy: Math.round((hits / (i + 1)) * 1000) / 10,
    });
  }
  return out;
}

function labelRace(race = {}) {
  return `${race.date || ""} ${race.venueLabel || race.venue || ""} ${race.number || ""}R`.trim();
}

export {
  loadWeights,
  proposeWeights,
  analyzePerformance,
  trackAnalyzerAccuracy,
  LEARNING_VERSION,
};
