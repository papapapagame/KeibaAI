/* ========================================
   Data Platform API Layer — Ver7.0
   AI はここ経由でのみデータ取得する
   Provider へ直接アクセス禁止
   ======================================== */

import {
  fetchViaPlatform,
  getPlatformStatus,
  clearPlatformCache,
  DataProviderManager,
} from "./data-provider-manager.js";
import { getSourceMode, setSourceMode, SOURCE_MODES } from "./source-mode.js";
import { getSchedulerState, buildUpdatePlan, markUpdated } from "./data-scheduler.js";
import { formatUpdateTime } from "./format.js";

export const DATA_API_VERSION = "7.0.0";

/**
 * AI向けレースバンドル取得
 * フロー: Provider → Normalizer → Validator → Cache → Unified Model → AI
 *
 * 戻り値は既存 analysis 互換:
 * { race, horses, settings, unified, legacy, status, validation, ok, ... }
 */
export async function getRaceBundleForAi(options = {}) {
  const result = await fetchViaPlatform({
    ...options,
    kind: "bundle",
  });

  if (!result.ok || !result.legacy) {
    return {
      ok: false,
      blocked: Boolean(result.blocked),
      message: result.message || "データ取得不可",
      status: result.status,
      validation: result.validation,
      legacy: null,
      unified: null,
      // analysis 互換の空
      race: null,
      horses: [],
      settings: {},
      count: { races: 0, horses: 0 },
    };
  }

  markUpdated("race");

  return {
    ok: true,
    blocked: false,
    message: result.message,
    platformVersion: DATA_API_VERSION,
    unified: result.unified,
    legacy: result.legacy,
    // スプレッドしやすい互換フィールド
    race: result.legacy.race,
    horses: result.legacy.horses,
    settings: result.legacy.settings,
    status: {
      ...result.status,
      updatedLabel: formatUpdateTime(result.fetchedAt || result.status?.fetchedAt),
      sourceMode: getSourceMode(),
    },
    validation: result.validation,
    count: result.counts,
    fetchedAt: result.fetchedAt,
    fromCache: result.fromCache,
    providerId: result.providerId,
    sourceLabel: result.sourceLabel,
  };
}

/**
 * 既存 fetchAnalysisBundle 互換ラッパ
 */
export async function fetchAnalysisBundleViaPlatform(options = {}) {
  const bundle = await getRaceBundleForAi(options);
  if (!bundle.ok) {
    return {
      race: null,
      horses: [],
      settings: {},
      legacy: { race: null, horses: [], settings: {} },
      status: {
        ...bundle.status,
        error: bundle.message,
        sourceLabel: bundle.blocked ? "Provider未接続" : bundle.status?.sourceLabel,
      },
      validation: bundle.validation,
      count: { races: 0, horses: 0 },
      ok: false,
      blocked: bundle.blocked,
      message: bundle.message,
    };
  }
  return {
    ...bundle.legacy,
    legacy: bundle.legacy,
    unified: bundle.unified,
    status: bundle.status,
    validation: bundle.validation,
    count: bundle.count,
    fetchedAt: bundle.fetchedAt,
    ok: true,
  };
}

export function getDataPlatformSnapshot() {
  return {
    ...getPlatformStatus(),
    sourceMode: getSourceMode(),
    sourceModes: SOURCE_MODES,
    scheduler: getSchedulerState(),
    updatePlan: buildUpdatePlan(),
  };
}

export {
  getSourceMode,
  setSourceMode,
  SOURCE_MODES,
  clearPlatformCache,
  getPlatformStatus,
  DataProviderManager,
  formatUpdateTime,
};
