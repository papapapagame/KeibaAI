/* ========================================
   News Manager — Ver8.0
   ======================================== */

import { fetchNewsRaw } from "./news-repository.js";
import { validateNewsItems } from "./news-validator.js";
import { normalizeNewsItems } from "./news-normalizer.js";
import { scoreNewsItems } from "./news-scoring-engine.js";
import {
  syncNews,
  fingerprintNews,
  getNewsOverlay,
  getLastNewsFingerprint,
  setLastNewsFingerprint,
  loadNewsHistory,
} from "./news-synchronizer.js";
import {
  computeNewsCompleteness,
  confidenceFromNewsCompleteness,
  formatNewsStagePanel,
  toAiNewsPayload,
  mergeNewsOntoHorses,
} from "./news-merge.js";
import { createNews } from "../models/unified.js";
import { NEWS_CATEGORY_LABEL } from "./news-categories.js";

export const NEWS_ENGINE_VERSION = "8.0.0";

let currentItems = [];
let lastAggregate = null;
let lastUpdatedAt = null;
let syncStatus = "idle";

export async function loadNewsForAi(options = {}) {
  const fetched = await fetchNewsRaw(options);
  if (!fetched.ok) {
    setNewsState([], { syncStatus: "error" });
    return emptyBundle(options, fetched);
  }

  const normalized = normalizeNewsItems(fetched.items || [], {
    raceNumber: options.raceNumber,
    venueId: options.venueId,
  });
  const validation = validateNewsItems(normalized, {
    raceNumber: options.raceNumber,
  });
  if (!validation.ok) {
    setNewsState([], { syncStatus: "validation_error" });
    return {
      ok: false,
      blocked: false,
      message: "News Validation failed",
      userMessage: "ニュース情報を取得できませんでした",
      providerId: fetched.providerId,
      providerName: fetched.providerName || null,
      providerKind: fetched.mode === "real" ? "Real" : "Mock",
      mode: fetched.mode || "mock",
      version: NEWS_ENGINE_VERSION,
      items: [],
      validation,
      newsCompleteness: computeNewsCompleteness([]),
      stagePanel: formatNewsStagePanel({}, null),
      sync: { status: "error" },
      aiNews: [],
      stats: emptyStats(),
      count: 0,
      updateCount: 0,
    };
  }

  const scored = scoreNewsItems(validation.sanitized);
  const items = scored.items;
  const aggregate = scored.aggregate;

  const prevFp = getLastNewsFingerprint();
  const fp = fingerprintNews(items);
  const contentChanged = fp !== prevFp;

  const sync = syncNews(items, {
    emitUpdate: options.emitUpdate === true && contentChanged && prevFp != null,
    silent: options.silent === true || options.emitUpdate === false,
    meta: fetched.meta,
  });
  setLastNewsFingerprint(fp);
  setNewsState(items, {
    updatedAt: fetched.meta?.updatedAt || new Date().toISOString(),
    syncStatus: contentChanged ? "synced" : "skipped",
    aggregate,
  });

  const stats = computeNewsStats(items, aggregate);
  const newsCompleteness = computeNewsCompleteness(items, aggregate);
  const aiNews = toAiNewsPayload(items);
  const unified = items.map((n) => createNews(n));

  return {
    ok: true,
    blocked: false,
    message: contentChanged ? "News loaded" : "News unchanged",
    providerId: fetched.providerId,
    providerName: fetched.providerName || null,
    providerKind: fetched.mode === "real" ? "Real" : "Mock",
    mode: fetched.mode || "mock",
    version: NEWS_ENGINE_VERSION,
    changed: contentChanged,
    fingerprint: fp,
    items,
    unified,
    aiNews,
    validation,
    stats,
    aggregate,
    scores: fetched.scores || {
      freshnessScore: aggregate.freshness,
      importanceScore: aggregate.importance,
      reliabilityScore: aggregate.reliability,
      coverageScore: aggregate.coverage,
      newsScore: Math.round(
        (Number(aggregate.freshness || 0) +
          Number(aggregate.importance || 0) +
          Number(aggregate.reliability || 0) +
          Number(aggregate.coverage || 0)) /
          4
      ),
    },
    newsCompleteness,
    stagePanel: formatNewsStagePanel(stats, newsCompleteness),
    sync: {
      status: contentChanged ? "synced" : "skipped",
      changes: sync.changes?.length || 0,
    },
    updateCount: fetched.meta?.updateCount ?? 0,
    count: items.length,
    fetchedAt: fetched.meta?.updatedAt || new Date().toISOString(),
    stageNote: "ニュースは構造化メタデータのみAI反映（本文非表示）",
    confidenceHint: confidenceFromNewsCompleteness(
      options.baseConfidence ?? 88,
      newsCompleteness
    ),
    history: loadNewsHistory().slice(0, 8),
    aiReflect: {
      status: "active",
      label: "構造化データ反映中",
      payloadCount: aiNews.length,
    },
    userMessage: null,
  };
}

export function mergeHorsesWithNews(horses, newsBundle) {
  if (!newsBundle?.ok) return horses || [];
  return mergeNewsOntoHorses(horses || [], newsBundle.items || []);
}

export function getNewsDashboard() {
  return {
    version: NEWS_ENGINE_VERSION,
    items: currentItems,
    stats: computeNewsStats(currentItems, lastAggregate || {}),
    aggregate: lastAggregate,
    updatedAt: lastUpdatedAt,
    syncStatus,
    overlayUpdatedAt: getNewsOverlay()?.updatedAt || lastUpdatedAt,
    fingerprint: getLastNewsFingerprint(),
    history: loadNewsHistory().slice(0, 10),
  };
}

export async function refreshNewsOnly(options = {}) {
  return loadNewsForAi({
    ...options,
    forceRefresh: true,
    emitUpdate: false,
    silent: true,
  });
}

function setNewsState(items = [], meta = {}) {
  currentItems = Array.isArray(items) ? items : [];
  lastAggregate = meta.aggregate || null;
  lastUpdatedAt = meta.updatedAt || new Date().toISOString();
  syncStatus = meta.syncStatus || "synced";
}

function computeNewsStats(items = [], aggregate = {}) {
  const byCategory = {};
  for (const key of Object.keys(NEWS_CATEGORY_LABEL)) {
    byCategory[key] = 0;
  }
  for (const n of items || []) {
    byCategory[n.category] = (byCategory[n.category] || 0) + 1;
  }
  return {
    total: items.length,
    important: aggregate.importantCount ?? items.filter((n) => (n.importanceScore || 0) >= 70).length,
    byCategory,
    categoryLabels: NEWS_CATEGORY_LABEL,
  };
}

function emptyStats() {
  return computeNewsStats([], {});
}

function emptyBundle(options, fetched) {
  const userMessage =
    fetched?.userMessage ||
    (fetched?.mode === "real"
      ? "ニュース情報を取得できませんでした"
      : fetched?.message || "ニュース情報を取得できませんでした");
  return {
    ok: false,
    blocked: Boolean(fetched?.blocked),
    message: fetched?.message || userMessage,
    userMessage,
    providerId: fetched?.providerId,
    providerName: fetched?.providerName || null,
    providerKind: fetched?.mode === "real" ? "Real" : "Mock",
    mode: fetched?.mode || "mock",
    version: NEWS_ENGINE_VERSION,
    items: [],
    aiNews: [],
    validation: fetched?.validation || {
      ok: false,
      errors: [{ code: "FETCH", message: fetched?.message || userMessage }],
      warnings: [],
    },
    newsCompleteness: computeNewsCompleteness([]),
    stagePanel: formatNewsStagePanel({}, null),
    sync: { status: "error" },
    stats: emptyStats(),
    count: 0,
    updateCount: 0,
    aiReflect: { status: "idle", label: "未反映", payloadCount: 0 },
  };
}

export const NewsManager = {
  loadForAi: loadNewsForAi,
  mergeHorses: mergeHorsesWithNews,
  dashboard: getNewsDashboard,
  refresh: refreshNewsOnly,
  version: NEWS_ENGINE_VERSION,
};
