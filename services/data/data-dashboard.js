/* ========================================
   Data Dashboard API — Ver7.0
   ======================================== */

import { getDataPlatformSnapshot, getRaceBundleForAi } from "./api.js";
import { getSourceMode, setSourceMode } from "./source-mode.js";
import { clearPlatformCache } from "./data-provider-manager.js";
import { createAllProviders } from "./providers/index.js";
import { getAllProviderHealth, getHealthSummary } from "./provider-health-monitor.js";
import { getSchedulerState, buildUpdatePlan } from "./data-scheduler.js";
import { formatUpdateTime } from "./format.js";

export async function getDataDashboard(options = {}) {
  // ダッシュボード表示時に Mock 経由で件数を暖機（Real 選択時は未接続のまま）
  let probe = null;
  if (options.probe !== false && getSourceMode() !== "real") {
    try {
      probe = await getRaceBundleForAi({
        raceNumber: options.raceNumber,
        forceRefresh: Boolean(options.forceRefresh),
      });
    } catch (error) {
      probe = { ok: false, message: error?.message || String(error) };
    }
  } else if (getSourceMode() === "real") {
    probe = { ok: false, blocked: true, message: "Provider未接続" };
  }

  const snap = getDataPlatformSnapshot();
  const providers = createAllProviders().map((p) => {
    const meta = p.getMeta();
    const health = getAllProviderHealth().find((h) => h.providerId === p.id);
    return {
      ...meta,
      status: health?.status || meta.status,
      latencyMs: health?.latencyMs ?? null,
      lastUpdate: health?.lastUpdate || null,
      lastUpdateLabel: formatUpdateTime(health?.lastUpdate),
      errorCount: health?.errorCount || 0,
      lastError: health?.lastError || null,
    };
  });

  return {
    version: "7.0.0",
    sourceMode: snap.sourceMode,
    currentProvider:
      snap.selection?.primaryId ||
      (snap.sourceMode === "real" ? "（未接続）" : "mock"),
    selectionNote: snap.selection?.note || "",
    blocked: Boolean(snap.selection?.blocked) || Boolean(probe?.blocked),
    blockMessage: probe?.blocked ? "Provider未接続" : "",
    cacheCount: snap.cache?.total || 0,
    cache: snap.cache,
    updatedAt: probe?.fetchedAt || snap.lastFetch?.fetchedAt || null,
    updatedLabel: formatUpdateTime(
      probe?.fetchedAt || snap.lastFetch?.fetchedAt
    ),
    dataCounts: {
      races: probe?.count?.races ?? snap.dataCounts?.races ?? 0,
      horses: probe?.count?.horses ?? snap.dataCounts?.horses ?? 0,
    },
    errorCount: (snap.errorCount || 0) + (probe?.ok === false ? 1 : 0),
    health: getHealthSummary(),
    providers,
    scheduler: getSchedulerState(),
    updatePlan: buildUpdatePlan(),
    validation: probe?.validation || null,
    probeOk: Boolean(probe?.ok),
    policy: {
      aiDirectProviderAccessForbidden: true,
      flow: "Provider → Normalizer → Validator → Cache → Unified Model → AI",
    },
  };
}

export function changeSourceMode(mode) {
  return setSourceMode(mode);
}

export function resetDataPlatformCache() {
  clearPlatformCache();
}
