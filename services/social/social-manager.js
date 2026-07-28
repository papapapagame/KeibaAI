/* ========================================
   Social Manager — Ver8.1
   ======================================== */

import { fetchSocialRaw } from "./social-repository.js";
import { normalizeSocialItems } from "./social-normalizer.js";
import { validateSocialItems } from "./social-validator.js";
import { analyzeTrends } from "./trend-analyzer.js";
import {
  syncSocialOverlay,
  fingerprintSocial,
  getSocialOverlay,
  getLastSocialFingerprint,
  setLastSocialFingerprint,
  loadSocialHistory,
} from "./social-synchronizer.js";
import {
  computeSocialCompleteness,
  confidenceFromSocialCompleteness,
  formatSocialStagePanel,
  toAiSocialPayload,
  mergeSocialOntoHorses,
  applySocialScoreAdjustments,
} from "./social-merge.js";
import { createSocial } from "../models/unified.js";
import { SOCIAL_CATEGORY_LABEL } from "./social-categories.js";

export const SOCIAL_ENGINE_VERSION = "8.1.0";

let currentTrends = null;
let currentItems = [];
let lastUpdatedAt = null;
let syncStatus = "idle";

export async function loadSocialForAi(options = {}) {
  const fetched = await fetchSocialRaw(options);
  if (!fetched.ok) {
    setSocialState(null, [], { syncStatus: "error" });
    return emptyBundle(options, fetched);
  }

  const normalized = normalizeSocialItems(fetched.items || [], {
    raceNumber: options.raceNumber,
    venueId: options.venueId,
  });
  const validation = validateSocialItems(normalized, {
    raceNumber: options.raceNumber,
  });

  if (!validation.ok || !(validation.sanitized || []).length) {
    setSocialState(null, [], { syncStatus: "validation_error" });
    return {
      ok: false,
      blocked: false,
      message: "Social Validation failed",
      providerId: fetched.providerId,
      version: SOCIAL_ENGINE_VERSION,
      items: [],
      trends: null,
      validation,
      socialCompleteness: computeSocialCompleteness(null),
      stagePanel: formatSocialStagePanel({}, null),
      sync: { status: "error" },
      aiSocial: toAiSocialPayload(null),
      stats: emptyStats(),
      aiReflect: { status: "idle", label: "未反映", payloadCount: 0 },
    };
  }

  const items = validation.sanitized;
  const trends = analyzeTrends(items, { now: Date.now() });
  const prevFp = getLastSocialFingerprint();
  const fp = fingerprintSocial(items, trends);
  const contentChanged = fp !== prevFp;

  const sync = syncSocialOverlay(items, trends, {
    emitUpdate: options.emitUpdate === true && contentChanged && prevFp != null,
    silent: options.silent === true || options.emitUpdate === false,
    meta: fetched.meta,
  });
  setLastSocialFingerprint(fp);
  setSocialState(trends, items, {
    updatedAt: fetched.meta?.updatedAt || new Date().toISOString(),
    syncStatus: contentChanged ? "synced" : "skipped",
  });

  const stats = computeSocialStats(items, trends);
  const socialCompleteness = computeSocialCompleteness(trends);
  const aiSocial = toAiSocialPayload(trends);
  const unified = createSocial({
    available: true,
    itemCount: items.length,
    totalPosts: trends.totalPosts,
    trendChange: trends.trendChange,
    scores: trends.scores,
    categories: trends.categories,
    topCategories: trends.topCategories,
    horses: trends.horses,
    importantTopics: trends.importantTopics,
    aiPayload: aiSocial,
    validation: {
      ok: validation.ok,
      errorCount: (validation.errors || []).length,
      warningCount: (validation.warnings || []).length,
    },
    syncState: contentChanged ? "synced" : "skipped",
    updatedAt: fetched.meta?.updatedAt || new Date().toISOString(),
    providerId: fetched.providerId,
    mode: fetched.mode,
  });

  return {
    ok: true,
    blocked: false,
    message: contentChanged ? "Social loaded" : "Social unchanged",
    providerId: fetched.providerId,
    version: SOCIAL_ENGINE_VERSION,
    changed: contentChanged,
    fingerprint: fp,
    items,
    trends,
    unified,
    aiSocial,
    validation,
    stats,
    socialCompleteness,
    stagePanel: formatSocialStagePanel(stats, socialCompleteness),
    sync: {
      status: contentChanged ? "synced" : "skipped",
      changes: sync.changes?.length || 0,
      reasons: sync.reasons || [],
    },
    count: items.length,
    fetchedAt: fetched.meta?.updatedAt || new Date().toISOString(),
    stageNote: "SNSは構造化メタデータのみAI反映（投稿本文非表示）",
    confidenceHint: confidenceFromSocialCompleteness(
      options.baseConfidence ?? 88,
      socialCompleteness
    ),
    history: loadSocialHistory().slice(0, 8),
    aiReflect: {
      status: "active",
      label: "構造化データ反映中",
      payloadCount: aiSocial.topics?.length || aiSocial.itemCount || 0,
    },
  };
}

export function mergeHorsesWithSocial(horses, socialBundle) {
  if (!socialBundle?.ok) return horses || [];
  return mergeSocialOntoHorses(horses || [], socialBundle.trends || null);
}

export { applySocialScoreAdjustments };

export function getSocialDashboard() {
  return {
    version: SOCIAL_ENGINE_VERSION,
    items: currentItems,
    trends: currentTrends,
    stats: computeSocialStats(currentItems, currentTrends),
    updatedAt: lastUpdatedAt,
    syncStatus,
    overlayUpdatedAt: getSocialOverlay()?.updatedAt || lastUpdatedAt,
    fingerprint: getLastSocialFingerprint(),
    history: loadSocialHistory().slice(0, 10),
  };
}

export async function refreshSocialOnly(options = {}) {
  return loadSocialForAi({
    ...options,
    forceRefresh: true,
    emitUpdate: false,
    silent: true,
  });
}

function setSocialState(trends, items = [], meta = {}) {
  currentTrends = trends;
  currentItems = Array.isArray(items) ? items : [];
  lastUpdatedAt = meta.updatedAt || new Date().toISOString();
  syncStatus = meta.syncStatus || "synced";
}

function computeSocialStats(items = [], trends = null) {
  const byCategory = {};
  for (const key of Object.keys(SOCIAL_CATEGORY_LABEL)) {
    byCategory[key] = 0;
  }
  for (const n of items || []) {
    byCategory[n.category] = (byCategory[n.category] || 0) + 1;
  }
  return {
    total: items.length,
    totalPosts: trends?.totalPosts || 0,
    topCategories: trends?.topCategories || [],
    trendScore: trends?.scores?.trend ?? null,
    attentionScore: trends?.scores?.attention ?? null,
    momentumScore: trends?.scores?.momentum ?? null,
    confidenceScore: trends?.scores?.confidence ?? null,
    byCategory,
    categoryLabels: SOCIAL_CATEGORY_LABEL,
  };
}

function emptyStats() {
  return computeSocialStats([], null);
}

function emptyBundle(options, fetched) {
  return {
    ok: false,
    blocked: Boolean(fetched?.blocked),
    message: fetched?.message || "Social 取得失敗",
    providerId: fetched?.providerId,
    version: SOCIAL_ENGINE_VERSION,
    items: [],
    trends: null,
    aiSocial: toAiSocialPayload(null),
    validation: {
      ok: false,
      errors: [{ code: "FETCH", message: fetched?.message }],
      warnings: [],
    },
    socialCompleteness: computeSocialCompleteness(null),
    stagePanel: formatSocialStagePanel({}, null),
    sync: { status: "error" },
    stats: emptyStats(),
    aiReflect: { status: "idle", label: "未反映", payloadCount: 0 },
  };
}

export const SocialManager = {
  loadForAi: loadSocialForAi,
  mergeHorses: mergeHorsesWithSocial,
  applyScores: applySocialScoreAdjustments,
  dashboard: getSocialDashboard,
  refresh: refreshSocialOnly,
  version: SOCIAL_ENGINE_VERSION,
};
