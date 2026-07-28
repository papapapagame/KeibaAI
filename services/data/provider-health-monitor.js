/* ========================================
   ProviderHealthMonitor — Ver7.0
   ======================================== */

import { PROVIDER_STATUS } from "./providers/base-provider.js";
import { nowIso } from "./utils.js";

const health = new Map();

export function recordProviderHealth(providerId, patch = {}) {
  const prev = health.get(providerId) || createEmpty(providerId);
  const next = {
    ...prev,
    ...patch,
    providerId,
    updatedAt: nowIso(),
  };
  health.set(providerId, next);
  return next;
}

export function recordSuccess(providerId, { latencyMs, count } = {}) {
  return recordProviderHealth(providerId, {
    status: PROVIDER_STATUS.ONLINE,
    latencyMs: latencyMs ?? null,
    lastUpdate: nowIso(),
    lastError: null,
    successCount: (health.get(providerId)?.successCount || 0) + 1,
    lastCount: count ?? null,
  });
}

export function recordError(providerId, error, { notConnected = false } = {}) {
  return recordProviderHealth(providerId, {
    status: notConnected ? PROVIDER_STATUS.NOT_CONNECTED : PROVIDER_STATUS.ERROR,
    lastError: error?.message || String(error),
    lastUpdate: nowIso(),
    errorCount: (health.get(providerId)?.errorCount || 0) + 1,
  });
}

export function recordOffline(providerId) {
  return recordProviderHealth(providerId, {
    status: PROVIDER_STATUS.OFFLINE,
    lastUpdate: nowIso(),
  });
}

export function getProviderHealth(providerId) {
  return health.get(providerId) || createEmpty(providerId);
}

export function getAllProviderHealth() {
  return [...health.values()].sort((a, b) =>
    String(a.providerId).localeCompare(String(b.providerId))
  );
}

export function getHealthSummary() {
  const all = getAllProviderHealth();
  return {
    total: all.length,
    online: all.filter((h) => h.status === PROVIDER_STATUS.ONLINE).length,
    offline: all.filter((h) => h.status === PROVIDER_STATUS.OFFLINE).length,
    error: all.filter((h) => h.status === PROVIDER_STATUS.ERROR).length,
    notConnected: all.filter((h) => h.status === PROVIDER_STATUS.NOT_CONNECTED)
      .length,
    errorCount: all.reduce((s, h) => s + (h.errorCount || 0), 0),
  };
}

export function resetHealth() {
  health.clear();
}

function createEmpty(providerId) {
  return {
    providerId,
    status: PROVIDER_STATUS.OFFLINE,
    latencyMs: null,
    lastUpdate: null,
    lastError: null,
    successCount: 0,
    errorCount: 0,
    lastCount: null,
    updatedAt: null,
  };
}

export const ProviderHealthMonitor = {
  recordSuccess,
  recordError,
  recordOffline,
  get: getProviderHealth,
  getAll: getAllProviderHealth,
  summary: getHealthSummary,
  reset: resetHealth,
};
