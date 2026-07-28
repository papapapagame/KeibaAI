/* ========================================
   KnowledgeManager — Ver6.5
   Knowledge Base（localStorage / 将来 SQLite・クラウド移行しやすい構造）
   ======================================== */

import { AI_VERSION, VERSION } from "../../js/config.js";

export const REVIEW_VERSION = "6.5.0";
export const REVIEW_DB_KEY = "papapa_iq_review_kb_v65";
export const REVIEW_DEMO_FLAG = "papapa_iq_review_demo_v65";

/**
 * Knowledge Base スキーマ
 * {
 *   schemaVersion, reviewVersion, engineVersion, appVersion,
 *   reviews[], lessons[], horseMemos{}, futureWatch[], history[], updatedAt
 * }
 */
export function createEmptyKnowledgeBase() {
  return {
    schemaVersion: 1,
    reviewVersion: REVIEW_VERSION,
    engineVersion: AI_VERSION,
    appVersion: VERSION,
    reviews: [],
    lessons: [],
    horseMemos: {},
    futureWatch: [],
    history: [],
    updatedAt: null,
  };
}

export function loadKnowledgeBase() {
  try {
    const raw = localStorage.getItem(REVIEW_DB_KEY);
    if (!raw) return createEmptyKnowledgeBase();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return createEmptyKnowledgeBase();
    return {
      ...createEmptyKnowledgeBase(),
      ...parsed,
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
      lessons: Array.isArray(parsed.lessons) ? parsed.lessons : [],
      horseMemos:
        parsed.horseMemos && typeof parsed.horseMemos === "object"
          ? parsed.horseMemos
          : {},
      futureWatch: Array.isArray(parsed.futureWatch) ? parsed.futureWatch : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return createEmptyKnowledgeBase();
  }
}

export function saveKnowledgeBase(kb) {
  const next = {
    ...createEmptyKnowledgeBase(),
    ...kb,
    reviewVersion: REVIEW_VERSION,
    engineVersion: kb.engineVersion || AI_VERSION,
    appVersion: VERSION,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(REVIEW_DB_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  return next;
}

export function clearKnowledgeBase() {
  try {
    localStorage.removeItem(REVIEW_DB_KEY);
    localStorage.removeItem(REVIEW_DEMO_FLAG);
  } catch {
    /* ignore */
  }
  return createEmptyKnowledgeBase();
}

/**
 * 1レース分の Knowledge レコード（将来の DB 行へマップしやすい）
 */
export function createKnowledgeRecord(payload = {}) {
  return {
    id: payload.id || `rv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    raceId: payload.raceId || null,
    horseId: payload.horseId || null,
    review: payload.review || null,
    lessons: payload.lessons || [],
    horseMemo: payload.horseMemo || null,
    winnerAnalysis: payload.winnerAnalysis || null,
    loserAnalysis: payload.loserAnalysis || null,
    futureWatch: payload.futureWatch || null,
    learningPayload: payload.learningPayload || null,
    version: REVIEW_VERSION,
    timestamp: payload.timestamp || new Date().toISOString(),
    appVersion: VERSION,
    engineVersion: AI_VERSION,
  };
}

export function upsertReview(kb, record) {
  const reviews = [...(kb.reviews || [])];
  const idx = reviews.findIndex(
    (r) => r.id === record.id || (record.raceId && r.raceId === record.raceId)
  );
  if (idx >= 0) reviews[idx] = { ...reviews[idx], ...record };
  else reviews.unshift(record);
  return {
    ...kb,
    reviews: reviews.slice(0, 100),
  };
}

export function appendLessons(kb, lessons, raceId) {
  const stamp = new Date().toISOString();
  const rows = (lessons || []).map((l, i) => ({
    id: l.id || `lesson_${Date.now()}_${i}`,
    raceId: raceId || null,
    category: l.category || "general",
    text: l.text,
    why: l.why || "",
    version: REVIEW_VERSION,
    timestamp: stamp,
  }));
  return {
    ...kb,
    lessons: [...rows, ...(kb.lessons || [])].slice(0, 300),
  };
}

/**
 * 馬ごとの AI メモを追記
 */
export function appendHorseMemo(kb, horseId, memo) {
  if (horseId == null || horseId === "") return kb;
  const key = String(horseId);
  const prev = kb.horseMemos?.[key] || {
    horseId: key,
    name: memo?.name || "",
    tags: [],
    notes: [],
    version: REVIEW_VERSION,
    updatedAt: null,
  };
  const tags = uniqueStrings([
    ...(prev.tags || []),
    ...((memo?.tags || []).map(String)),
  ]).slice(0, 24);
  const notes = [
    {
      text: memo?.text || memo?.note || "",
      why: memo?.why || "",
      raceId: memo?.raceId || null,
      timestamp: new Date().toISOString(),
      version: REVIEW_VERSION,
    },
    ...(prev.notes || []),
  ]
    .filter((n) => n.text)
    .slice(0, 40);

  return {
    ...kb,
    horseMemos: {
      ...(kb.horseMemos || {}),
      [key]: {
        ...prev,
        name: memo?.name || prev.name,
        tags,
        notes,
        version: REVIEW_VERSION,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

export function mergeFutureWatch(kb, watch) {
  const flat = [
    ...(watch?.nextWatch || []),
    ...(watch?.dangerFavorites || []),
    ...(watch?.rising || []),
    ...(watch?.falling || []),
  ].map((w) => ({
    ...w,
    version: REVIEW_VERSION,
    timestamp: new Date().toISOString(),
  }));
  return {
    ...kb,
    futureWatch: [...flat, ...(kb.futureWatch || [])].slice(0, 200),
  };
}

export function appendHistory(kb, event) {
  const row = {
    id: `rh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    type: event?.type || "review",
    message: event?.message || "",
    raceId: event?.raceId || null,
    meta: event?.meta || {},
    version: REVIEW_VERSION,
  };
  return {
    ...kb,
    history: [row, ...(kb.history || [])].slice(0, 200),
  };
}

export function getKnowledgeStats(kb) {
  const memos = Object.keys(kb.horseMemos || {}).length;
  return {
    reviewCount: (kb.reviews || []).length,
    lessonCount: (kb.lessons || []).length,
    horseMemoCount: memos,
    futureWatchCount: (kb.futureWatch || []).length,
    historyCount: (kb.history || []).length,
    total:
      (kb.reviews || []).length +
      (kb.lessons || []).length +
      memos +
      (kb.futureWatch || []).length,
  };
}

function uniqueStrings(arr) {
  const seen = new Set();
  const out = [];
  for (const s of arr) {
    const t = String(s || "").trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export const KnowledgeManager = {
  load: loadKnowledgeBase,
  save: saveKnowledgeBase,
  clear: clearKnowledgeBase,
  createRecord: createKnowledgeRecord,
  upsertReview,
  appendLessons,
  appendHorseMemo,
  mergeFutureWatch,
  appendHistory,
  stats: getKnowledgeStats,
  REVIEW_VERSION,
  REVIEW_DB_KEY,
};
