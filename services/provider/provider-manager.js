/* ========================================
   Provider Manager — Ver7.4
   AI/画面はここ経由のみ Provider にアクセス
   ======================================== */

import { PROVIDER_HEALTH, PROVIDER_VERSION } from "./provider-interface.js";
import { ensureRegistry, listRegistryMetas } from "./provider-registry.js";
import { loadProvidersForKind } from "./provider-loader.js";
import {
  checkAllProviders,
  checkProviderHealth,
  getAllProviderHealth,
  setProviderHealth,
} from "./provider-health-checker.js";
import { logProviderEvent, getProviderLogs } from "./provider-logger.js";
import { mergeProviderResults } from "./data-merge.js";
import { createProvenance, attachProvenance } from "./data-provenance.js";
import { getPriorityChain } from "./priority.js";
import { getSourceMode } from "../data/source-mode.js";

export const PROVIDER_FRAMEWORK_VERSION = "7.4.0";

let lastAcquireMeta = null;
let lastFailoverState = { active: false, path: [], finalProviderId: null };
let lastMergeState = { strategy: "none", sources: [], note: "" };

const METHOD_BY_KIND = {
  Bundle: "fetchBundle",
  Race: "fetchRace",
  Horse: "fetchHorse",
  Horses: "fetchHorses",
  Jockey: "fetchJockey",
  Trainer: "fetchTrainer",
  Odds: "fetchOdds",
  Weather: "fetchWeather",
  TrackCondition: "fetchTrackCondition",
  News: "fetchNews",
  Review: "fetchReview",
  Market: "fetchMarket",
};

/**
 * Framework 経由でデータ取得（Failover + Merge + Provenance）
 */
export async function acquire(dataKind = "Bundle", options = {}) {
  ensureRegistry();
  const kind = normalizeKind(dataKind);
  const loaded = loadProvidersForKind(kind, options);

  if (loaded.blocked) {
    lastFailoverState = { active: false, path: [], finalProviderId: null };
    lastMergeState = { strategy: "none", sources: [], note: "blocked" };
    lastAcquireMeta = buildDashboard({
      ok: false,
      blocked: true,
      message: loaded.blockReason || "Provider未接続",
      mode: loaded.mode,
      kind,
    });
    return {
      ok: false,
      blocked: true,
      message: "Provider未接続",
      providerId: null,
      data: null,
      raw: null,
      provenance: null,
      framework: lastAcquireMeta,
    };
  }

  const path = [];
  const successes = [];
  let lastError = null;
  let failoverFrom = null;

  for (const provider of loaded.providers) {
    path.push(provider.id);
    setProviderHealth(provider.id, PROVIDER_HEALTH.WAITING);

    if (!provider.implemented) {
      setProviderHealth(provider.id, PROVIDER_HEALTH.OFFLINE, {
        note: "Provider未接続",
      });
      logProviderEvent("failover_skip", {
        providerId: provider.id,
        message: "未接続のためスキップ",
      });
      failoverFrom = failoverFrom || provider.id;
      continue;
    }

    try {
      const methodName = METHOD_BY_KIND[kind] || "fetchBundle";
      const fn = provider[methodName];
      if (typeof fn !== "function") {
        throw new Error(`method missing: ${methodName}`);
      }

      const started = performance.now();
      const result = await fn.call(provider, options);
      const latencyMs = Math.round(performance.now() - started);

      setProviderHealth(provider.id, PROVIDER_HEALTH.ONLINE, { latencyMs });
      logProviderEvent("fetch_ok", {
        providerId: provider.id,
        message: `${kind} ok (${latencyMs}ms)`,
        latencyMs,
      });

      const data = normalizeResultData(kind, result);
      successes.push({
        ok: true,
        providerId: provider.id,
        implemented: true,
        data,
        rawResult: result,
        fetchedAt: result?.fetchedAt || new Date().toISOString(),
        latencyMs: result?.latencyMs ?? latencyMs,
        health: PROVIDER_HEALTH.ONLINE,
        count: result?.count || {
          horses: data?.horses?.length || data?.items?.length || 0,
          races: data?.races?.length || (data?.race ? 1 : 0),
        },
        quality: null,
      });

      // Bundle は最初の成功で十分（追加成功があれば Merge）
      // 複数実装時のみ continue して merge。現状 Mock のみなので break。
      if (!options.mergeAll) break;
    } catch (err) {
      lastError = err;
      setProviderHealth(provider.id, PROVIDER_HEALTH.ERROR, {
        note: err?.message || "fetch error",
      });
      logProviderEvent("fetch_error", {
        providerId: provider.id,
        message: err?.message || "fetch error",
      });
      failoverFrom = failoverFrom || provider.id;
      logProviderEvent("failover", {
        providerId: provider.id,
        message: `障害検知 → 次候補へ`,
      });
    }
  }

  lastFailoverState = {
    active: Boolean(failoverFrom) && successes.length > 0,
    path,
    finalProviderId: successes[0]?.providerId || null,
    failoverFrom,
  };

  if (!successes.length) {
    const message =
      loaded.mode === "real"
        ? "Provider未接続"
        : lastError?.message || "全 Provider 取得失敗";
    lastMergeState = { strategy: "none", sources: [], note: "no success" };
    lastAcquireMeta = buildDashboard({
      ok: false,
      blocked: loaded.mode === "real",
      message,
      mode: loaded.mode,
      kind,
      path,
    });
    return {
      ok: false,
      blocked: loaded.mode === "real",
      message,
      providerId: null,
      data: null,
      raw: null,
      provenance: null,
      framework: lastAcquireMeta,
    };
  }

  const merged = mergeProviderResults(successes, { kind });
  lastMergeState = {
    strategy: merged.strategy,
    sources: merged.sources,
    note: merged.note,
    primaryId: merged.primaryId,
  };

  const primary = successes[0];
  const provenance = createProvenance({
    providerId: merged.primaryId || primary.providerId,
    providerVersion: primary.rawResult?.providerVersion || PROVIDER_VERSION,
    fetchedAt: primary.fetchedAt,
    status: "ok",
    health: PROVIDER_HEALTH.ONLINE,
    latencyMs: primary.latencyMs,
    sourceLabel: primary.rawResult?.sourceLabel || primary.providerId,
    failoverFrom: lastFailoverState.active ? failoverFrom : null,
    mergeSources: merged.sources,
  });

  const dataWithProv = attachProvenance(merged.merged, provenance);
  const count = primary.count || {
    races: dataWithProv?.races?.length || 1,
    horses: dataWithProv?.horses?.length || 0,
  };

  lastAcquireMeta = buildDashboard({
    ok: true,
    blocked: false,
    message: "ok",
    mode: loaded.mode,
    kind,
    path,
    providerId: provenance.providerId,
    count,
  });

  return {
    ok: true,
    blocked: false,
    message: "Provider Framework ok",
    providerId: provenance.providerId,
    sourceLabel: provenance.sourceLabel,
    data: dataWithProv,
    raw: dataWithProv,
    count,
    fetchedAt: provenance.fetchedAt,
    provenance,
    merge: lastMergeState,
    failover: lastFailoverState,
    framework: lastAcquireMeta,
  };
}

export async function acquireBundle(options = {}) {
  return acquire("Bundle", options);
}

export function getFrameworkStatus() {
  ensureRegistry();
  return (
    lastAcquireMeta ||
    buildDashboard({
      ok: null,
      message: "not yet acquired",
      mode: getSourceMode(),
      kind: "Bundle",
    })
  );
}

export function getFrameworkDashboard() {
  ensureRegistry();
  const metas = listRegistryMetas();
  const health = getAllProviderHealth();
  const healthById = new Map(health.map((h) => [h.providerId, h]));

  return {
    version: PROVIDER_FRAMEWORK_VERSION,
    mode: getSourceMode(),
    providers: metas.map((m) => ({
      ...m,
      health: healthById.get(m.id)?.health || m.health || PROVIDER_HEALTH.UNKNOWN,
      lastCheck: healthById.get(m.id)?.checkedAt || null,
      latencyMs: healthById.get(m.id)?.latencyMs ?? null,
      note: healthById.get(m.id)?.note || m.note,
    })),
    priority: {
      Race: getPriorityChain("Race"),
      Bundle: getPriorityChain("Bundle"),
      Odds: getPriorityChain("Odds"),
    },
    failover: lastFailoverState,
    merge: lastMergeState,
    last: lastAcquireMeta,
    logs: getProviderLogs(20),
  };
}

export async function refreshProviderHealth() {
  const providers = ensureRegistry();
  return checkAllProviders(providers);
}

function normalizeResultData(kind, result) {
  if (!result) return null;
  if (kind === "Bundle") {
    return result.raw || result.data || result;
  }
  if (result.raw) return result.raw;
  if (result.item != null) return result.item;
  if (result.items != null) return result.items;
  return result.data != null ? result.data : result;
}

function normalizeKind(kind) {
  const s = String(kind || "Bundle");
  const map = {
    bundle: "Bundle",
    race: "Race",
    horse: "Horse",
    horses: "Horses",
    jockey: "Jockey",
    trainer: "Trainer",
    odds: "Odds",
    weather: "Weather",
    trackcondition: "TrackCondition",
    track: "TrackCondition",
    news: "News",
    review: "Review",
    market: "Market",
  };
  return map[s.toLowerCase()] || s;
}

function buildDashboard({
  ok,
  blocked = false,
  message,
  mode,
  kind,
  path = [],
  providerId = null,
  count = { races: 0, horses: 0 },
}) {
  return {
    version: PROVIDER_FRAMEWORK_VERSION,
    ok,
    blocked,
    message,
    mode,
    kind,
    providerId,
    count,
    failover: lastFailoverState,
    merge: lastMergeState,
    path,
    updatedAt: new Date().toISOString(),
  };
}

export const ProviderManager = {
  acquire,
  acquireBundle,
  status: getFrameworkStatus,
  dashboard: getFrameworkDashboard,
  refreshHealth: refreshProviderHealth,
  checkOne: checkProviderHealth,
  version: PROVIDER_FRAMEWORK_VERSION,
};
