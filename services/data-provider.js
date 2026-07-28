/* ========================================
   PAPAPA IQ KEIBA - services/data-provider.js
   Ver5.1 データ取得ファサード
   - Provider切替
   - キャッシュ
   - 更新時刻
   - エラー管理
   ======================================== */

import {
  DATA_CACHE_TTL_MS,
  DATA_PROVIDER,
  DEBUG,
  DEBUG_MODE,
} from "../js/config.js";
import { DummyProvider } from "./providers/dummy-provider.js";
import { CsvProvider } from "./providers/csv-provider.js";
import { ApiProvider } from "./providers/api-provider.js";
import { JraProvider } from "./providers/jra-provider.js";
import { toLegacyHorses, toLegacyRace } from "./models.js";

const CACHE_KEY = "papapa_iq_data_cache_v51";

const PROVIDERS = {
  dummy: () => new DummyProvider(),
  csv: () => new CsvProvider(),
  api: () => new ApiProvider(),
  jra: () => new JraProvider(),
};

let lastStatus = createEmptyStatus();

/**
 * レース分析用バンドル取得
 * @param {{ raceNumber?: number, forceRefresh?: boolean, forceError?: boolean }} options
 */
export async function fetchAnalysisBundle(options = {}) {
  const provider = resolveProvider();
  const cacheKey = buildCacheKey(provider.id, options.raceNumber);

  if (options.forceError) {
    return handleFetchFailure(
      new Error("Simulated network failure (debug)"),
      provider,
      cacheKey,
      options
    );
  }

  try {
    if (!options.forceRefresh) {
      const cached = readCache(cacheKey);
      if (cached && !isExpired(cached.fetchedAt)) {
        lastStatus = buildStatus({
          provider,
          fetchedAt: cached.fetchedAt,
          fromCache: true,
          count: cached.count,
          error: null,
          usingCacheFallback: false,
        });
        logDebug("cache-hit", lastStatus);
        return decorateBundle(cached, lastStatus);
      }
    }

    const bundle = await provider.fetchBundle(options);
    const stored = {
      ...bundle,
      fetchedAt: bundle.fetchedAt || new Date().toISOString(),
      cacheKey,
    };
    writeCache(cacheKey, stored);

    lastStatus = buildStatus({
      provider,
      fetchedAt: stored.fetchedAt,
      fromCache: false,
      count: stored.count,
      error: null,
      usingCacheFallback: false,
    });
    logDebug("fetch-ok", lastStatus, stored.count);
    return decorateBundle(stored, lastStatus);
  } catch (error) {
    return handleFetchFailure(error, provider, cacheKey, options);
  }
}

function handleFetchFailure(error, provider, cacheKey, options) {
  const cached = readCache(cacheKey);
  const message = error?.message || String(error);

  if (cached) {
    lastStatus = buildStatus({
      provider,
      fetchedAt: cached.fetchedAt,
      fromCache: true,
      count: cached.count,
      error: message,
      usingCacheFallback: true,
    });
    logDebug("fetch-fail-cache", lastStatus, message);
    return decorateBundle(cached, lastStatus);
  }

  lastStatus = buildStatus({
    provider,
    fetchedAt: null,
    fromCache: false,
    count: { races: 0, horses: 0 },
    error: message,
    usingCacheFallback: false,
  });
  logDebug("fetch-fail", lastStatus, message);

  // 呼び出し側で UI 表示できるよう、空バンドルを返す（throwしない）
  return decorateBundle(
    {
      provider: provider.getMeta(),
      venues: [],
      races: [],
      race: null,
      horses: [],
      settings: {},
      fetchedAt: null,
      count: { races: 0, horses: 0 },
    },
    lastStatus
  );
}

export function getDataStatus() {
  return { ...lastStatus };
}

export function clearDataCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
  lastStatus = { ...lastStatus, fromCache: false };
  logDebug("cache-cleared");
}

export function listProviders() {
  return Object.keys(PROVIDERS);
}

export function formatUpdateTime(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${d} ${hh}:${mm}`;
}

function resolveProvider() {
  const key = String(DATA_PROVIDER || "dummy").toLowerCase();
  const factory = PROVIDERS[key] || PROVIDERS.dummy;
  return factory();
}

function decorateBundle(bundle, status) {
  const race = bundle.race;
  const horses = bundle.horses || [];
  return {
    ...bundle,
    status,
    legacy: {
      race: race ? toLegacyRace(race) : null,
      horses: toLegacyHorses(horses),
      settings: bundle.settings || {},
    },
  };
}

function buildCacheKey(providerId, raceNumber) {
  return `${providerId}:race:${Number(raceNumber) || 0}`;
}

function readCache(cacheKey) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    return all?.[cacheKey] || null;
  } catch {
    return null;
  }
}

function writeCache(cacheKey, bundle) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[cacheKey] = {
      provider: bundle.provider,
      venues: bundle.venues,
      races: bundle.races,
      race: bundle.race,
      horses: bundle.horses,
      settings: bundle.settings,
      fetchedAt: bundle.fetchedAt,
      count: bundle.count,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch {
    /* quota / private mode */
  }
}

function isExpired(fetchedAt) {
  if (!fetchedAt) return true;
  const t = new Date(fetchedAt).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() - t > (DATA_CACHE_TTL_MS || 10 * 60 * 1000);
}

function buildStatus({
  provider,
  fetchedAt,
  fromCache,
  count,
  error,
  usingCacheFallback,
}) {
  return {
    providerId: provider.id,
    providerLabel: provider.label,
    sourceLabel: provider.label,
    fetchedAt,
    updatedLabel: formatUpdateTime(fetchedAt || new Date().toISOString()),
    fromCache: Boolean(fromCache),
    usingCacheFallback: Boolean(usingCacheFallback),
    count: count || { races: 0, horses: 0 },
    error: error || null,
    cacheTtlMs: DATA_CACHE_TTL_MS,
    debug: Boolean(DEBUG || DEBUG_MODE),
  };
}

function createEmptyStatus() {
  return {
    providerId: DATA_PROVIDER || "dummy",
    providerLabel: "—",
    sourceLabel: "—",
    fetchedAt: null,
    updatedLabel: "—",
    fromCache: false,
    usingCacheFallback: false,
    count: { races: 0, horses: 0 },
    error: null,
    cacheTtlMs: DATA_CACHE_TTL_MS,
    debug: Boolean(DEBUG || DEBUG_MODE),
  };
}

function logDebug(event, status, extra) {
  if (!(DEBUG || DEBUG_MODE)) return;
  console.log(`[data-provider] ${event}`, status || "", extra || "");
}
