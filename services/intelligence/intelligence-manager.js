/* ========================================
   PAPAPA IQ KEIBA - Intelligence Manager
   Ver5.2 Real Intelligence Connect
   ======================================== */

import { createDefaultProviders } from "./providers/index.js";
import { PROVIDER_STATUS } from "./providers/base-intelligence-provider.js";
import {
  clearIntelCache,
  isCacheExpired,
  readIntelCache,
  writeIntelCache,
} from "./cache/intelligence-cache.js";
import { validateIntelligenceItems } from "./validators/data-validator.js";
import { preprocessForAi } from "./preprocess/ai-preprocessor.js";
import {
  clearMonitorStats,
  getMonitorRows,
  recordProviderRun,
} from "./monitor/provider-monitor.js";

const LOG_KEY = "papapa_iq_intel_logs_v52";
const MAX_LOGS = 40;
const DEBUG_SNAPSHOT_KEY = "papapa_iq_intel_debug_v52";

let providers = [];
let fetchLogs = readLogs();
let lastCollectAt = null;
let lastDebugSnapshot = null;

export function initIntelligenceManager(customProviders) {
  providers =
    Array.isArray(customProviders) && customProviders.length
      ? customProviders
      : createDefaultProviders();
  sortByPriority();
  return getProviderMetas();
}

function ensureInit() {
  if (!providers.length) initIntelligenceManager();
}

function sortByPriority() {
  providers.sort((a, b) => a.priority - b.priority);
}

export function registerProvider(provider) {
  ensureInit();
  if (!provider || !provider.id) return;
  const idx = providers.findIndex((p) => p.id === provider.id);
  if (idx >= 0) providers[idx] = provider;
  else providers.push(provider);
  sortByPriority();
}

export function setProviderEnabled(id, enabled) {
  ensureInit();
  const p = providers.find((x) => x.id === id);
  if (!p) return false;
  p.setEnabled(enabled);
  return true;
}

export function setProviderPriority(id, priority) {
  ensureInit();
  const p = providers.find((x) => x.id === id);
  if (!p) return false;
  p.priority = Number(priority) || p.priority;
  sortByPriority();
  return true;
}

export function getProviderMetas() {
  ensureInit();
  return providers.map((p) => p.getMeta());
}

export function getProviderStatusMap() {
  const map = {};
  for (const meta of getProviderMetas()) {
    map[meta.id] = meta.status;
  }
  return map;
}

export function clearProviderCache(id) {
  clearIntelCache(id);
}

export function clearAllIntelligenceState() {
  clearIntelCache();
  clearFetchLogs();
  clearMonitorStats();
  lastDebugSnapshot = null;
  try {
    localStorage.removeItem(DEBUG_SNAPSHOT_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {{ race?: object, horses?: object[], forceRefresh?: boolean }} context
 */
export async function collectIntelligence(context = {}) {
  ensureInit();
  const results = [];
  const providerBundles = [];

  for (const provider of providers) {
    const started = performance.now();
    let cacheStatus = "MISS";
    let count = 0;
    let error = null;
    let fetchedAt = null;
    let responseMs = 0;
    let items = [];
    let validation = null;

    try {
      if (!provider.enabled) {
        provider.status = PROVIDER_STATUS.DISABLED;
        const row = buildResultRow(provider, {
          status: PROVIDER_STATUS.DISABLED,
          count: 0,
          cacheStatus: "SKIP",
          responseMs: 0,
        });
        results.push(row);
        recordProviderRun(row);
        pushLog(row);
        continue;
      }

      if (!provider.implemented) {
        const raw = await provider.fetch(context);
        responseMs = raw.responseMs || Math.round(performance.now() - started);
        const row = buildResultRow(provider, {
          status: PROVIDER_STATUS.OFFLINE,
          count: 0,
          cacheStatus: "TODO",
          updatedAt: raw.fetchedAt,
          responseMs,
          implemented: false,
        });
        results.push(row);
        recordProviderRun(row);
        pushLog(row);
        continue;
      }

      if (!context.forceRefresh) {
        const cached = readIntelCache(provider.id);
        if (cached && !isCacheExpired(cached)) {
          cacheStatus = "HIT";
          items = cached.items || [];
          count = cached.count || items.length;
          fetchedAt = cached.fetchedAt;
          responseMs = 0;
          provider.markSuccess(count, 0);
          provider.status = PROVIDER_STATUS.ONLINE;
          validation = validateIntelligenceItems(items);
          providerBundles.push({
            providerId: provider.id,
            items,
            fromCache: true,
          });
          const row = buildResultRow(provider, {
            status: provider.status,
            count,
            cacheStatus,
            updatedAt: fetchedAt,
            responseMs,
            validation,
          });
          results.push(row);
          recordProviderRun(row);
          pushLog(row);
          continue;
        }
      }

      const raw = await provider.fetch(context);
      items = Array.isArray(raw.items) ? raw.items : [];
      fetchedAt = raw.fetchedAt || new Date().toISOString();
      responseMs =
        raw.responseMs != null
          ? raw.responseMs
          : Math.round(performance.now() - started);
      count = items.length;
      validation = validateIntelligenceItems(items);

      const written = writeIntelCache(provider.id, {
        items,
        fetchedAt,
        meta: { validation: validation.summary },
      });
      cacheStatus = written.unchanged ? "DIFF_UNCHANGED" : "MISS→STORE";

      providerBundles.push({
        providerId: provider.id,
        items,
        fromCache: false,
      });

      const row = buildResultRow(provider, {
        status: provider.status,
        count,
        cacheStatus,
        updatedAt: fetchedAt,
        responseMs,
        validation,
        implemented: true,
      });
      results.push(row);
      recordProviderRun(row);
      pushLog(row);
    } catch (err) {
      error = err?.message || String(err);
      responseMs = Math.round(performance.now() - started);
      provider.markError(err, responseMs);

      // 期限切れでもキャッシュがあればフォールバック
      const cached = readIntelCache(provider.id);
      if (cached?.items?.length) {
        items = cached.items;
        count = items.length;
        fetchedAt = cached.fetchedAt;
        cacheStatus = "HIT (fallback)";
        validation = validateIntelligenceItems(items);
        providerBundles.push({
          providerId: provider.id,
          items,
          fromCache: true,
          fallback: true,
        });
      }

      const row = buildResultRow(provider, {
        status: PROVIDER_STATUS.ERROR,
        count,
        cacheStatus,
        updatedAt: fetchedAt,
        responseMs,
        error,
        validation,
      });
      results.push(row);
      recordProviderRun(row);
      pushLog(row);
    }
  }

  const preprocessed = preprocessForAi(providerBundles);
  lastCollectAt = new Date().toISOString();
  lastDebugSnapshot = {
    collectedAt: lastCollectAt,
    rawByProvider: preprocessed.rawByProvider,
    normalized: preprocessed.normalized,
    normalizedCounts: preprocessed.debug.normalizedCounts,
    validations: preprocessed.validations,
    cache: listCacheDebug(),
    providers: results,
  };
  persistDebugSnapshot(lastDebugSnapshot);

  return {
    collectedAt: lastCollectAt,
    providers: results,
    normalized: preprocessed.normalized,
    aiInput: preprocessed.aiInput,
    validations: preprocessed.validations,
    validationSummary: preprocessed.validationSummary,
    monitor: getMonitorRows(results, getProviderMetas()),
    debug: lastDebugSnapshot,
    logs: getFetchLogs(),
  };
}

export function getFetchLogs() {
  return [...fetchLogs];
}

export function clearFetchLogs() {
  fetchLogs = [];
  try {
    localStorage.removeItem(LOG_KEY);
  } catch {
    /* ignore */
  }
}

export function getLastCollectAt() {
  return lastCollectAt;
}

export function getDebugSnapshot() {
  if (lastDebugSnapshot) return lastDebugSnapshot;
  try {
    const raw = localStorage.getItem(DEBUG_SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getProviderMonitor() {
  return getMonitorRows([], getProviderMetas());
}

function buildResultRow(provider, extra = {}) {
  return {
    providerId: provider.id,
    label: provider.label,
    status: extra.status || provider.status,
    count: extra.count || 0,
    cacheStatus: extra.cacheStatus || "—",
    updatedAt: extra.updatedAt || provider.lastUpdatedAt || null,
    responseMs: extra.responseMs || 0,
    error: extra.error || null,
    implemented: extra.implemented !== false && provider.implemented !== false,
    validation: extra.validation?.summary || null,
  };
}

function listCacheDebug() {
  try {
    const out = [];
    for (const p of providers) {
      const cached = readIntelCache(p.id);
      if (!cached) continue;
      out.push({
        providerId: p.id,
        fetchedAt: cached.fetchedAt,
        expiresAt: cached.expiresAt,
        count: cached.count,
        contentHash: cached.contentHash,
        expired: isCacheExpired(cached),
      });
    }
    return out;
  } catch {
    return [];
  }
}

function pushLog(entry) {
  fetchLogs.unshift({
    ...entry,
    at: new Date().toISOString(),
  });
  if (fetchLogs.length > MAX_LOGS) fetchLogs = fetchLogs.slice(0, MAX_LOGS);
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(fetchLogs));
  } catch {
    /* ignore */
  }
}

function readLogs() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistDebugSnapshot(snapshot) {
  try {
    // Keep debug payload compact for localStorage
    const compact = {
      collectedAt: snapshot.collectedAt,
      normalizedCounts: snapshot.normalizedCounts,
      validations: snapshot.validations,
      cache: snapshot.cache,
      providers: snapshot.providers,
      rawSample: Object.fromEntries(
        Object.entries(snapshot.rawByProvider || {}).map(([k, v]) => [
          k,
          (v || []).slice(0, 3),
        ])
      ),
      normalizedSample: {
        horses: (snapshot.normalized?.horses || []).slice(0, 2),
        races: (snapshot.normalized?.races || []).slice(0, 2),
        histories: (snapshot.normalized?.histories || []).slice(0, 2),
        news: (snapshot.normalized?.news || []).slice(0, 2),
      },
    };
    localStorage.setItem(DEBUG_SNAPSHOT_KEY, JSON.stringify(compact));
  } catch {
    /* ignore */
  }
}
