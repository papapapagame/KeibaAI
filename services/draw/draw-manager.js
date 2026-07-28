/* ========================================
   Draw Manager — Ver7.7
   枠順・騎手・斤量の確定情報オーケストレーション
   ======================================== */

import { fetchDrawRaw } from "./draw-repository.js";
import { validateDraws } from "./draw-validator.js";
import {
  syncDraws,
  fingerprintDraws,
  getDrawOverlay,
  getLastDrawFingerprint,
  setLastDrawFingerprint,
} from "./draw-synchronizer.js";
import {
  setDrawState,
  getDrawStateSnapshot,
  computeDrawStats,
  loadDrawHistory,
} from "./draw-state-manager.js";
import {
  computeDrawCompleteness,
  confidenceFromDrawCompleteness,
} from "./draw-completeness.js";
import { formatDrawStagePanel } from "./draw-formatter.js";
import { jockeyStatusSummary } from "./jockey-manager.js";
import { weightStatusSummary } from "./weight-manager.js";
import { mergeDrawOntoHorses } from "./draw-adjustment.js";
import { createHorse, createFrame, createJockey, createWeight } from "../models/unified.js";

export const DRAW_ENGINE_VERSION = "7.7.0";

/**
 * 枠順〜斤量を取得し、Stage 用に整形
 */
export async function loadDrawForAi(options = {}) {
  const fetched = await fetchDrawRaw(options);
  if (!fetched.ok) {
    setDrawState([], {
      syncStatus: "error",
      updatedAt: new Date().toISOString(),
    });
    return emptyBundle(options, fetched);
  }

  const validation = validateDraws(fetched.items || []);
  if (!validation.ok) {
    setDrawState([], {
      syncStatus: "validation_error",
      updatedAt: new Date().toISOString(),
    });
    return {
      ok: false,
      blocked: false,
      message: "Draw Validation failed",
      providerId: fetched.providerId,
      version: DRAW_ENGINE_VERSION,
      draws: [],
      validation,
      stats: computeDrawStats([]),
      drawCompleteness: computeDrawCompleteness([]),
      stagePanel: formatDrawStagePanel(options.stage || 0, null),
      sync: { status: "error" },
      confirmedStage: 0,
      effectiveStage: Number(options.stage) || 0,
    };
  }

  const draws = validation.sanitized;
  const prevFp = getLastDrawFingerprint();
  const fp = fingerprintDraws(draws);
  const contentChanged = fp !== prevFp;

  const sync = syncDraws(draws, {
    emitUpdate: options.emitUpdate === true && contentChanged && prevFp != null,
    silent: options.silent === true || options.emitUpdate === false,
    meta: fetched.meta,
  });
  setLastDrawFingerprint(fp);
  setDrawState(draws, {
    updatedAt: fetched.meta?.updatedAt || new Date().toISOString(),
    syncStatus: contentChanged ? "synced" : "skipped",
  });

  const baseStage = Number(options.stage ?? 0) || 0;
  const confirmedStage = computeConfirmedStage(draws);
  const effectiveStage = Math.max(baseStage, confirmedStage);
  const drawCompleteness = computeDrawCompleteness(draws);
  const stats = computeDrawStats(draws);
  const stagePanel = formatDrawStagePanel(effectiveStage, drawCompleteness);

  const unified = draws.map((d) => createDrawUnified(d));

  return {
    ok: true,
    blocked: false,
    message: contentChanged ? "Draw loaded" : "Draw unchanged",
    providerId: fetched.providerId,
    version: DRAW_ENGINE_VERSION,
    changed: contentChanged,
    fingerprint: fp,
    draws,
    unified,
    validation,
    stats,
    drawCompleteness,
    stagePanel,
    jockeyStatus: jockeyStatusSummary(draws),
    weightStatus: weightStatusSummary(draws),
    sync: {
      status: contentChanged ? "synced" : "skipped",
      changes: sync.changes?.length || 0,
    },
    count: draws.length,
    fetchedAt: fetched.meta?.updatedAt || new Date().toISOString(),
    confirmedStage,
    effectiveStage,
    stageNote: stageNote(effectiveStage, confirmedStage),
    confidenceHint: confidenceFromDrawCompleteness(
      options.baseConfidence ?? 78,
      drawCompleteness
    ),
    history: loadDrawHistory().slice(0, 8),
  };
}

/**
 * 確定段階: 枠=3 / 騎手=4 / 斤量=5
 * 未確定は推測で上げない
 */
export function computeConfirmedStage(draws = []) {
  const active = (draws || []).filter((d) => !d.scratched && !d.excluded);
  if (!active.length) return 0;

  const frameOk = active.every((d) => d.frameConfirmed && d.frame > 0);
  if (!frameOk) return 0;

  const jockeyOk = active.every((d) => d.jockeyConfirmed);
  if (!jockeyOk) return 3;

  const weightOk = active.every((d) => d.weightConfirmed);
  if (!weightOk) return 4;

  return 5;
}

export function mergeHorsesWithDraw(horses, drawBundle, stage) {
  const s = Number(stage ?? drawBundle?.effectiveStage ?? 0) || 0;
  if (s < 3 || !drawBundle?.ok) return horses || [];
  return mergeDrawOntoHorses(horses || [], drawBundle.draws || [], s);
}

export function getDrawDashboard() {
  const snap = getDrawStateSnapshot();
  const overlay = getDrawOverlay();
  return {
    version: DRAW_ENGINE_VERSION,
    ...snap,
    overlayUpdatedAt: overlay?.updatedAt || snap.updatedAt,
    fingerprint: getLastDrawFingerprint(),
    history: loadDrawHistory().slice(0, 10),
    jockeyStatus: jockeyStatusSummary(snap.draws || []),
    weightStatus: weightStatusSummary(snap.draws || []),
  };
}

export async function refreshDrawOnly(options = {}) {
  return loadDrawForAi({
    ...options,
    forceRefresh: true,
    emitUpdate: false,
    silent: true,
  });
}

function createDrawUnified(d) {
  const horse = createHorse({
    number: d.number,
    horse: d.horse,
    frame: d.frameConfirmed ? d.frame : null,
    jockey: d.jockeyConfirmed ? d.jockey : null,
    weight: d.weightConfirmed ? d.weight : null,
  });
  return {
    kind: "DrawEntry",
    ...horse,
    frame: d.frameConfirmed
      ? createFrame(d.frame)
      : { frame: 0, confirmed: false },
    jockey: d.jockeyConfirmed
      ? createJockey({ name: d.jockey, confirmed: true })
      : createJockey(null),
    weight: d.weightConfirmed
      ? createWeight({ kg: d.weight, confirmed: true })
      : { kg: null, confirmed: false },
    riderChanged: Boolean(d.riderChanged),
    previousJockey: d.previousJockey || null,
    scratched: Boolean(d.scratched),
    excluded: Boolean(d.excluded),
    jockeyHistory: d.jockeyHistory || [],
    weightHistory: d.weightHistory || [],
    frameConfirmed: Boolean(d.frameConfirmed),
    jockeyConfirmed: Boolean(d.jockeyConfirmed),
    weightConfirmed: Boolean(d.weightConfirmed),
  };
}

function stageNote(effectiveStage, confirmedStage) {
  if (confirmedStage >= 5) return "枠順・騎手・斤量確定（オッズは未取得）";
  if (confirmedStage >= 4) return "枠順・騎手確定（斤量待機）";
  if (confirmedStage >= 3) return "枠順確定（騎手・斤量待機）";
  if (effectiveStage < 3) return "枠順未確定（Entry情報のみ）";
  return "Draw 情報取得中";
}

function emptyBundle(options, fetched) {
  return {
    ok: false,
    blocked: Boolean(fetched?.blocked),
    message: fetched?.message || "Draw 取得失敗",
    providerId: fetched?.providerId,
    version: DRAW_ENGINE_VERSION,
    draws: [],
    validation: {
      ok: false,
      errors: [{ code: "FETCH", message: fetched?.message }],
      warnings: [],
    },
    stats: computeDrawStats([]),
    drawCompleteness: computeDrawCompleteness([]),
    stagePanel: formatDrawStagePanel(options.stage || 0, null),
    sync: { status: "error" },
    confirmedStage: 0,
    effectiveStage: Number(options.stage) || 0,
  };
}

export const DrawManager = {
  loadForAi: loadDrawForAi,
  merge: mergeHorsesWithDraw,
  confirmedStage: computeConfirmedStage,
  dashboard: getDrawDashboard,
  refresh: refreshDrawOnly,
  version: DRAW_ENGINE_VERSION,
};
