/* ========================================
   Production Health — Ver10.6
   System / Provider / Cache / Memory / Queue 統合（新機能なし）
   ======================================== */

import {
  VERSION,
  RELEASE_CHANNEL,
  BUILD_DATE,
  BUILD_NUMBER,
  DATA_CACHE_TTL_MS,
  PREFETCH_DEDUP_TTL_MS,
  UPDATE_EVENT_DEDUP_MS,
} from "../../js/config.js";
import { getErrorStats } from "./service-guard.js";
import { getPrefetchMemoryStats } from "./prefetch-deduper.js";
import { getProviderIntegrationReport } from "./provider-integration.js";
import {
  getFrameworkDashboard,
  refreshProviderHealth,
} from "../provider/provider-manager.js";
import { getCacheStats, purgeExpiredCache } from "../data/data-cache-manager.js";
import { getUpdateStatus } from "../update/smart-update-engine.js";
import { getCalendarMode } from "../calendar/calendar-mode.js";
import { getEntryMode } from "../entry/entry-mode.js";
import { getOddsMode } from "../odds/odds-mode.js";
import { getWeatherMode } from "../weather/weather-mode.js";
import { getNewsMode } from "../news/news-mode.js";
import { getSocialMode } from "../social/social-mode.js";

export const PRODUCTION_HEALTH_VERSION = "10.6.0";

/**
 * 本番運用向けヘルス集約
 */
export async function getProductionHealth(options = {}) {
  const refresh = options.refreshProviders !== false;
  if (refresh) {
    try {
      await refreshProviderHealth();
    } catch {
      /* health refresh 失敗でも他指標は返す */
    }
  }

  const purged = purgeExpiredCache();
  const errors = getErrorStats();
  const cache = getCacheStats();
  const memory = getPrefetchMemoryStats();
  const update = getUpdateStatus();
  const framework = getFrameworkDashboard();
  const integration = getProviderIntegrationReport();
  const modes = getProviderModeSnapshot();
  const providerHealth = summarizeProviderHealth(framework?.providers || []);
  const successRate = computeSuccessRate(providerHealth, errors);
  const systemHealth = computeSystemHealth({
    integration,
    providerHealth,
    errors,
    successRate,
  });

  return {
    version: PRODUCTION_HEALTH_VERSION,
    app: {
      version: VERSION,
      channel: RELEASE_CHANNEL,
      buildDate: BUILD_DATE,
      buildNumber: BUILD_NUMBER,
    },
    systemHealth,
    providerHealth,
    cache: {
      ...cache,
      ttlMs: DATA_CACHE_TTL_MS,
      purgedExpired: purged.removed || 0,
      statusLabel: cache.total > 0 ? "ACTIVE" : "EMPTY",
    },
    memory: {
      ...memory,
      prefetchTtlMs: PREFETCH_DEDUP_TTL_MS,
      statusLabel: memory.size > 0 ? "ACTIVE" : "IDLE",
    },
    updateQueue: {
      length: Number(update?.queueLength) || 0,
      status: update?.status || "idle",
      statusLabel: update?.statusLabel || "—",
      autoUpdate: Boolean(update?.autoUpdate),
      eventDedupMs: UPDATE_EVENT_DEDUP_MS,
    },
    errors: {
      errorCount: errors.errorCount,
      warningCount: errors.warningCount,
      recoveries: errors.recoveries,
      lastError: errors.lastError,
    },
    modes,
    currentProviders: formatCurrentProviders(modes),
    successRate,
    integration,
    frameworkSummary: {
      providerCount: (framework?.providers || []).length,
      mode: framework?.mode || null,
    },
    fetchedAt: new Date().toISOString(),
  };
}

export function getProviderModeSnapshot() {
  return {
    calendar: safeMode(getCalendarMode),
    entry: safeMode(getEntryMode),
    odds: safeMode(getOddsMode),
    weather: safeMode(getWeatherMode),
    news: safeMode(getNewsMode),
    social: safeMode(getSocialMode),
  };
}

export function formatCurrentProviders(modes = getProviderModeSnapshot()) {
  const entries = [
    ["Race", modes.calendar],
    ["Horse", modes.entry],
    ["Odds", modes.odds],
    ["Weather", modes.weather],
    ["News", modes.news],
    ["Social", modes.social],
  ];
  return {
    label: entries
      .map(([k, m]) => `${k}:${m === "real" ? "R" : "M"}`)
      .join(" "),
    realCount: entries.filter(([, m]) => m === "real").length,
    mockCount: entries.filter(([, m]) => m !== "real").length,
    mix:
      entries.every(([, m]) => m === "real")
        ? "Real"
        : entries.every(([, m]) => m !== "real")
          ? "Mock"
          : "Mixed",
    entries: Object.fromEntries(entries),
  };
}

function summarizeProviderHealth(providers = []) {
  const list = Array.isArray(providers) ? providers : [];
  const counts = { ONLINE: 0, OFFLINE: 0, ERROR: 0, WAITING: 0, UNKNOWN: 0 };
  for (const p of list) {
    const h = String(p.health || "UNKNOWN").toUpperCase();
    if (counts[h] == null) counts.UNKNOWN += 1;
    else counts[h] += 1;
  }
  const enabledReal = list.filter((p) =>
    String(p.id || "").startsWith("real-")
  );
  const onlineReal = enabledReal.filter(
    (p) => String(p.health || "").toUpperCase() === "ONLINE"
  ).length;
  let label = "UNKNOWN";
  if (counts.ERROR > 0) label = "DEGRADED";
  else if (counts.ONLINE > 0 && counts.OFFLINE === 0 && counts.ERROR === 0) {
    label = "HEALTHY";
  } else if (counts.ONLINE > 0) label = "PARTIAL";
  else if (counts.OFFLINE > 0) label = "OFFLINE";

  return {
    label,
    total: list.length,
    online: counts.ONLINE,
    offline: counts.OFFLINE,
    error: counts.ERROR,
    waiting: counts.WAITING,
    unknown: counts.UNKNOWN,
    realOnline: onlineReal,
    realTotal: enabledReal.length,
    detail: `${counts.ONLINE} online / ${counts.ERROR} error / ${counts.OFFLINE} offline`,
  };
}

function computeSuccessRate(providerHealth, errors) {
  const attempts =
    Number(providerHealth?.online || 0) +
    Number(providerHealth?.error || 0) +
    Number(errors?.errorCount || 0);
  if (attempts <= 0) {
    return {
      percent: null,
      label: "—",
      attempts: 0,
      successes: Number(providerHealth?.online || 0),
    };
  }
  const successes = Number(providerHealth?.online || 0);
  const percent = Math.round((successes / attempts) * 100);
  return {
    percent,
    label: `${percent}%`,
    attempts,
    successes,
  };
}

function computeSystemHealth({
  integration,
  providerHealth,
  errors,
  successRate,
}) {
  const errorCount = Number(errors?.errorCount) || 0;
  let label = "HEALTHY";
  let score = 100;
  if (!integration?.ok) {
    label = "NEEDS_REVIEW";
    score -= 30;
  }
  if (providerHealth?.label === "DEGRADED" || providerHealth?.error > 0) {
    label = "DEGRADED";
    score -= 25;
  } else if (providerHealth?.label === "PARTIAL") {
    if (label === "HEALTHY") label = "PARTIAL";
    score -= 10;
  }
  if (errorCount >= 5) {
    label = "DEGRADED";
    score -= 20;
  } else if (errorCount > 0) {
    score -= Math.min(15, errorCount * 3);
    if (label === "HEALTHY") label = "PARTIAL";
  }
  if (successRate?.percent != null && successRate.percent < 70) {
    label = "DEGRADED";
    score -= 15;
  }
  score = Math.max(0, Math.min(100, score));
  return {
    label,
    score,
    detail:
      label === "HEALTHY"
        ? "Production Integration 正常"
        : label === "PARTIAL"
          ? "一部指標に注意"
          : label === "NEEDS_REVIEW"
            ? "統合確認が必要"
            : "障害または品質低下あり",
  };
}

function safeMode(fn) {
  try {
    return fn() || "mock";
  } catch {
    return "mock";
  }
}

export const ProductionHealth = {
  get: getProductionHealth,
  modes: getProviderModeSnapshot,
  currentProviders: formatCurrentProviders,
  version: PRODUCTION_HEALTH_VERSION,
};
