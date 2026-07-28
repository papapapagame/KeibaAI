/* ========================================
   Odds Manager — Ver7.8
   ======================================== */

import { fetchOddsRaw } from "./odds-repository.js";
import { validateOdds } from "./odds-validator.js";
import {
  syncOdds,
  fingerprintOdds,
  getOddsOverlay,
  getLastOddsFingerprint,
  setLastOddsFingerprint,
} from "./odds-synchronizer.js";
import {
  loadOddsHistory,
} from "./odds-history-manager.js";
import { analyzeMarket } from "./market-analyzer.js";
import {
  computeOddsCompleteness,
  confidenceFromOddsCompleteness,
  formatOddsStagePanel,
  mergeOddsOntoHorses,
} from "./odds-merge.js";
import { createOdds, createPopularity } from "../models/unified.js";

export const ODDS_ENGINE_VERSION = "7.8.0";

let currentOdds = [];
let lastStats = emptyStats();
let lastUpdatedAt = null;
let syncStatus = "idle";
let lastPhase = "none";

export async function loadOddsForAi(options = {}) {
  const fetched = await fetchOddsRaw(options);
  if (!fetched.ok) {
    setOddsState([], { syncStatus: "error", phase: "none" });
    return emptyBundle(options, fetched);
  }

  // Real は Provider 側で検証・Market 算出済
  let odds;
  let validation;
  let marketStatus = fetched.meta?.marketStatus || null;

  if (fetched.mode === "real" && fetched.validation?.ok) {
    validation = fetched.validation;
    odds = fetched.items || [];
    // Real sync 済みでも Market Score を確実に付与
    if (!odds.some((o) => o.marketScore != null)) {
      const market = analyzeMarket(odds);
      odds = market.items;
      marketStatus = market.marketStatus;
    }
  } else {
    validation = validateOdds(fetched.items || []);
    if (!validation.ok) {
      setOddsState([], { syncStatus: "validation_error", phase: fetched.phase });
      return {
        ok: false,
        blocked: false,
        message: "Odds Validation failed",
        userMessage: "オッズ情報を取得できませんでした",
        providerId: fetched.providerId,
        mode: fetched.mode || "mock",
        version: ODDS_ENGINE_VERSION,
        odds: [],
        validation,
        stats: emptyStats(),
        oddsCompleteness: computeOddsCompleteness([]),
        stagePanel: formatOddsStagePanel(options.stage || 0, null),
        sync: { status: "error" },
        confirmedStage: 0,
        effectiveStage: Number(options.stage) || 0,
        marketStatus: { count: 0 },
      };
    }
    const market = analyzeMarket(validation.sanitized);
    odds = market.items;
    marketStatus = market.marketStatus;
  }

  const prevFp = getLastOddsFingerprint();
  const fp = fingerprintOdds(odds);
  const contentChanged =
    fetched.meta?.changed != null
      ? Boolean(fetched.meta.changed)
      : fp !== prevFp;

  const sync = syncOdds(odds, {
    emitUpdate: options.emitUpdate === true && contentChanged && prevFp != null,
    silent: options.silent === true || options.emitUpdate === false,
    meta: fetched.meta,
  });
  setLastOddsFingerprint(fp);

  const phase = fetched.phase || fetched.meta?.phase || "final";
  setOddsState(odds, {
    updatedAt: fetched.meta?.updatedAt || new Date().toISOString(),
    syncStatus: contentChanged ? "synced" : "skipped",
    phase,
  });

  const baseStage = Number(options.stage ?? 0) || 0;
  const confirmedStage = computeOddsConfirmedStage(odds, phase);
  const effectiveStage = Math.max(baseStage, confirmedStage);
  const oddsCompleteness = computeOddsCompleteness(odds);
  const stagePanel = formatOddsStagePanel(effectiveStage, oddsCompleteness);
  const stats = computeOddsStats(odds);

  return {
    ok: true,
    blocked: false,
    message: contentChanged ? "Odds loaded" : "Odds unchanged",
    providerId: fetched.providerId,
    providerName: fetched.providerName || fetched.providerId,
    providerKind: fetched.mode === "real" ? "Real" : "Mock",
    mode: fetched.mode || "mock",
    version: ODDS_ENGINE_VERSION,
    changed: contentChanged,
    fingerprint: fp,
    odds,
    unified: odds.map(createOddsUnified),
    validation,
    stats,
    oddsCompleteness,
    stagePanel,
    marketStatus: marketStatus || { count: odds.length },
    sync: {
      status: contentChanged ? "synced" : "skipped",
      changes: sync.changes?.length || 0,
    },
    count: odds.length,
    updateCount: fetched.meta?.updateCount ?? null,
    fetchedAt: fetched.meta?.updatedAt || new Date().toISOString(),
    phase,
    confirmedStage,
    effectiveStage,
    stageNote: stageNote(effectiveStage, phase),
    confidenceHint: confidenceFromOddsCompleteness(
      options.baseConfidence ?? 82,
      oddsCompleteness
    ),
    history: loadOddsHistory().slice(0, 8),
  };
}

export function computeOddsConfirmedStage(odds = [], phase = "final") {
  const list = odds || [];
  if (!list.length) return 0;
  const ok = list.every(
    (o) =>
      o.oddsConfirmed &&
      Number.isFinite(Number(o.winOdds)) &&
      Number.isFinite(Number(o.popularity))
  );
  if (!ok) return 0;
  if (phase === "eve" || phase === "previous") return 6;
  return 7;
}

export function mergeHorsesWithOdds(horses, oddsBundle, stage) {
  const s = Number(stage ?? oddsBundle?.effectiveStage ?? 0) || 0;
  if (s < 6 || !oddsBundle?.ok) return horses || [];
  return mergeOddsOntoHorses(horses || [], oddsBundle.odds || [], s);
}

export function getOddsDashboard() {
  return {
    version: ODDS_ENGINE_VERSION,
    odds: currentOdds,
    stats: { ...lastStats },
    updatedAt: lastUpdatedAt,
    syncStatus,
    phase: lastPhase,
    overlayUpdatedAt: getOddsOverlay()?.updatedAt || lastUpdatedAt,
    fingerprint: getLastOddsFingerprint(),
    history: loadOddsHistory().slice(0, 10),
  };
}

export async function refreshOddsOnly(options = {}) {
  return loadOddsForAi({
    ...options,
    forceRefresh: true,
    emitUpdate: false,
    silent: true,
  });
}

function setOddsState(odds = [], meta = {}) {
  currentOdds = Array.isArray(odds) ? odds : [];
  lastStats = computeOddsStats(currentOdds);
  lastUpdatedAt = meta.updatedAt || new Date().toISOString();
  syncStatus = meta.syncStatus || "synced";
  lastPhase = meta.phase || lastPhase;
}

function computeOddsStats(odds = []) {
  const list = odds || [];
  return {
    total: list.length,
    withPlace: list.filter((o) => o.placeOdds != null).length,
    withIndex: list.filter((o) => o.marketIndex != null).length,
    shortening: list.filter((o) => o.oddsTrend === "shortening").length,
    drifting: list.filter((o) => o.oddsTrend === "drifting").length,
  };
}

function createOddsUnified(o) {
  return {
    kind: "OddsEntry",
    number: o.number,
    horse: o.horse,
    odds: createOdds({
      win: o.winOdds,
      place: o.placeOdds,
      confirmed: true,
      updatedAt: o.updatedAt,
    }),
    popularity: createPopularity({ value: o.popularity, confirmed: true }),
    marketIndex: o.marketIndex,
    marketScore: o.marketScore,
    supportScore: o.supportScore,
    valueScore: o.valueScore,
    marketLabel: o.marketLabel,
    oddsTrend: o.oddsTrend,
    history: o.history || [],
  };
}

function stageNote(effectiveStage, phase) {
  if (effectiveStage >= 7) return "最新オッズ・人気・市場情報を反映";
  if (effectiveStage >= 6) return "前日オッズを反映（当日最終は待機）";
  if (phase === "none") return "オッズ未取得";
  return "オッズ待機（Stage6未満）";
}

function emptyStats() {
  return computeOddsStats([]);
}

function emptyBundle(options, fetched) {
  return {
    ok: false,
    blocked: Boolean(fetched?.blocked),
    message: fetched?.userMessage || fetched?.message || "Odds 取得失敗",
    userMessage:
      fetched?.userMessage ||
      fetched?.message ||
      "オッズ情報を取得できませんでした",
    providerId: fetched?.providerId,
    providerKind: fetched?.mode === "real" ? "Real" : "Mock",
    mode: fetched?.mode || "mock",
    version: ODDS_ENGINE_VERSION,
    odds: [],
    validation: fetched?.validation || {
      ok: false,
      errors: [{ code: "FETCH", message: fetched?.message }],
      warnings: [],
    },
    stats: emptyStats(),
    oddsCompleteness: computeOddsCompleteness([]),
    stagePanel: formatOddsStagePanel(options.stage || 0, null),
    sync: { status: "error" },
    confirmedStage: 0,
    effectiveStage: Number(options.stage) || 0,
    marketStatus: { count: 0 },
  };
}

export const OddsManager = {
  loadForAi: loadOddsForAi,
  merge: mergeHorsesWithOdds,
  confirmedStage: computeOddsConfirmedStage,
  dashboard: getOddsDashboard,
  refresh: refreshOddsOnly,
  version: ODDS_ENGINE_VERSION,
};
