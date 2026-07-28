/* ========================================
   DataProviderManager — Ver7.0
   Provider → Normalizer → Validator → Cache
   ======================================== */

import { normalizeBundle } from "./data-normalizer.js";
import { validateNormalized } from "./data-validator.js";
import {
  readCache,
  writeCache,
  clearCache,
  getCacheStats,
} from "./data-cache-manager.js";
import { markUpdated } from "./data-scheduler.js";
import {
  recordSuccess,
  recordError,
  getAllProviderHealth,
  getHealthSummary,
} from "./provider-health-monitor.js";
import { selectProviders, describeSelection } from "./provider-selector.js";
import { createAllProviders } from "./providers/index.js";
import { getSourceMode } from "./source-mode.js";
import { nowIso } from "./utils.js";

const PLATFORM_VERSION = "7.0.0";

let lastFetchMeta = null;
let lastErrorCount = 0;
let lastDataCounts = { races: 0, horses: 0 };

/**
 * バンドル取得パイプライン（AI 直アクセス禁止のための中核）
 */
export async function fetchViaPlatform(options = {}) {
  const selection = selectProviders({ mode: options.mode });
  const described = describeSelection(selection);
  const cacheKey = buildCacheKey(
    described.primaryId || selection.mode,
    options.raceNumber,
    options.kind || "bundle"
  );

  if (options.forceError) {
    lastErrorCount += 1;
    return {
      ok: false,
      blocked: false,
      message: "Simulated network failure (debug)",
      selection: described,
      unified: null,
      legacy: null,
      validation: {
        ok: false,
        errors: [{ code: "FORCE_ERROR", message: "Simulated network failure (debug)" }],
        warnings: [],
      },
      status: buildStatus({
        selection: described,
        error: "Simulated network failure (debug)",
        fromCache: false,
      }),
    };
  }

  if (selection.blocked) {
    lastErrorCount += 1;
    lastFetchMeta = {
      ok: false,
      blocked: true,
      message: selection.blockReason || "Provider未接続",
      selection: described,
      fetchedAt: nowIso(),
    };
    // Real 未接続時はキャッシュも AI へ渡さない（不正経路防止）
    return {
      ok: false,
      blocked: true,
      message: "Provider未接続",
      selection: described,
      status: buildStatus({
        selection: described,
        error: "Provider未接続",
        fromCache: false,
      }),
      unified: null,
      legacy: null,
      validation: { ok: false, errors: [{ code: "NOT_CONNECTED", message: "Provider未接続" }], warnings: [] },
    };
  }

  if (!options.forceRefresh) {
    const cached = readCache(cacheKey);
    if (cached?.value?.ok && cached.value.unified) {
      lastFetchMeta = {
        ok: true,
        fromCache: true,
        selection: described,
        fetchedAt: cached.fetchedAt,
      };
      return {
        ...cached.value,
        fromCache: true,
        cacheLayer: cached.layer,
        status: buildStatus({
          selection: described,
          fetchedAt: cached.fetchedAt,
          fromCache: true,
          count: cached.value.counts,
        }),
      };
    }
  }

  const providers = [selection.primary, ...(selection.fallbacks || [])].filter(
    Boolean
  );
  let lastError = null;

  for (const provider of providers) {
    try {
      const started = performance.now();
      const rawBundle = await provider.fetchBundle(options);
      const latencyMs =
        rawBundle.latencyMs ?? Math.round(performance.now() - started);

      const normalized = normalizeBundle(rawBundle);
      const validated = validateNormalized(normalized);

      if (!validated.ok) {
        recordError(provider.id, new Error("Validation failed"));
        lastError = {
          code: "VALIDATION",
          message: validated.errors.map((e) => e.message).join("; "),
          errors: validated.errors,
        };
        lastErrorCount += 1;
        // 異常データは AI へ渡さない → 次の fallback へ
        continue;
      }

      const counts = {
        races: normalized.unified.races?.length || 1,
        horses: normalized.unified.horses?.length || 0,
      };
      lastDataCounts = counts;

      recordSuccess(provider.id, {
        latencyMs,
        count: counts.horses,
      });
      markUpdated("race");
      markUpdated("odds");

      const payload = {
        ok: true,
        blocked: false,
        message: selection.note,
        platformVersion: PLATFORM_VERSION,
        selection: describeSelection({
          ...selection,
          primary: provider,
          note: selection.note,
        }),
        unified: validated.sanitized.unified,
        legacy: validated.sanitized.legacy,
        validation: {
          ok: true,
          errors: [],
          warnings: validated.warnings,
        },
        counts,
        providerId: provider.id,
        sourceLabel: rawBundle.sourceLabel || provider.label,
        fetchedAt: rawBundle.fetchedAt || nowIso(),
        latencyMs,
        fromCache: false,
      };

      writeCache(cacheKey, payload, {
        fetchedAt: payload.fetchedAt,
        providerId: provider.id,
        count: counts,
      });

      lastFetchMeta = {
        ok: true,
        fromCache: false,
        selection: payload.selection,
        fetchedAt: payload.fetchedAt,
      };

      return {
        ...payload,
        status: buildStatus({
          selection: payload.selection,
          fetchedAt: payload.fetchedAt,
          fromCache: false,
          count: counts,
          latencyMs,
        }),
      };
    } catch (error) {
      const notConnected = error?.code === "PROVIDER_NOT_CONNECTED";
      recordError(provider.id, error, { notConnected });
      lastError = error;
      lastErrorCount += 1;
    }
  }

  lastFetchMeta = {
    ok: false,
    message: lastError?.message || "データ取得失敗",
    selection: described,
    fetchedAt: nowIso(),
  };

  return {
    ok: false,
    blocked: false,
    message: lastError?.message || "データ取得失敗",
    selection: described,
    unified: null,
    legacy: null,
    validation: {
      ok: false,
      errors: [
        {
          code: "FETCH_FAILED",
          message: lastError?.message || "fetch failed",
        },
      ],
      warnings: [],
    },
    status: buildStatus({
      selection: described,
      error: lastError?.message || "fetch failed",
      fromCache: false,
    }),
  };
}

export function getPlatformStatus() {
  const mode = getSourceMode();
  const selection = selectProviders({ mode });
  return {
    platformVersion: PLATFORM_VERSION,
    mode,
    selection: describeSelection(selection),
    lastFetch: lastFetchMeta,
    cache: getCacheStats(),
    health: getHealthSummary(),
    providers: createAllProviders().map((p) => p.getMeta()),
    providerHealth: getAllProviderHealth(),
    dataCounts: lastDataCounts,
    errorCount: lastErrorCount,
  };
}

export function clearPlatformCache() {
  clearCache();
}

function buildCacheKey(providerId, raceNumber, kind) {
  return `${providerId || "none"}:${kind}:${raceNumber || "default"}`;
}

function buildStatus({
  selection,
  fetchedAt,
  fromCache,
  count,
  error,
  latencyMs,
} = {}) {
  return {
    providerId: selection?.primaryId || "—",
    sourceLabel: selection?.blocked
      ? "Provider未接続"
      : selection?.note || selection?.mode || "—",
    sourceMode: selection?.mode || getSourceMode(),
    fromCache: Boolean(fromCache),
    fetchedAt: fetchedAt || null,
    updatedLabel: fetchedAt
      ? new Date(fetchedAt).toLocaleString("ja-JP")
      : "—",
    count: count || null,
    error: error || null,
    latencyMs: latencyMs ?? null,
    platformVersion: PLATFORM_VERSION,
  };
}

export const DataProviderManager = {
  fetch: fetchViaPlatform,
  status: getPlatformStatus,
  clearCache: clearPlatformCache,
  version: PLATFORM_VERSION,
};
