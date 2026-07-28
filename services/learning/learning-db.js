/* ========================================
   Learning Database — Ver5.5
   localStorage / 将来 SQLite・クラウドへ移行しやすい構造
   ======================================== */

import { AI_VERSION, VERSION } from "../../js/config.js";

export const LEARNING_VERSION = "5.5.0";
export const LEARNING_DB_KEY = "papapa_iq_learning_ai_v55";
export const LEARNING_WEIGHTS_KEY = "papapa_iq_learning_weights_v55";

/**
 * DB スキーマ（JSONドキュメント）
 * { schemaVersion, engineVersion, learningVersion, records[], history[], updatedAt }
 */
export function createEmptyDatabase() {
  return {
    schemaVersion: 1,
    engineVersion: AI_VERSION,
    learningVersion: LEARNING_VERSION,
    appVersion: VERSION,
    records: [],
    history: [],
    updatedAt: null,
  };
}

export function loadLearningDatabase() {
  try {
    const raw = localStorage.getItem(LEARNING_DB_KEY);
    if (!raw) return createEmptyDatabase();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return createEmptyDatabase();
    return {
      ...createEmptyDatabase(),
      ...parsed,
      records: Array.isArray(parsed.records) ? parsed.records : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return createEmptyDatabase();
  }
}

export function saveLearningDatabase(db) {
  const next = {
    ...createEmptyDatabase(),
    ...db,
    engineVersion: db.engineVersion || AI_VERSION,
    learningVersion: LEARNING_VERSION,
    appVersion: VERSION,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(LEARNING_DB_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  return next;
}

export function clearLearningDatabase() {
  try {
    localStorage.removeItem(LEARNING_DB_KEY);
  } catch {
    /* ignore */
  }
  return createEmptyDatabase();
}

/**
 * 1レース分の学習レコード（将来DB行にマップしやすいフラット構造）
 */
export function createLearningRecord(payload = {}) {
  return {
    id: payload.id || `lr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: payload.timestamp || new Date().toISOString(),
    engineVersion: payload.engineVersion || AI_VERSION,
    learningVersion: LEARNING_VERSION,
    appVersion: VERSION,
    race: payload.race || {},
    prediction: payload.prediction || {},
    result: payload.result || null,
    analyzerSnapshot: payload.analyzerSnapshot || {},
    scores: payload.scores || {},
    diff: payload.diff || null,
    metrics: payload.metrics || null,
    explain: payload.explain || null,
  };
}
