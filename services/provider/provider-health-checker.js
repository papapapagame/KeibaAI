/* ========================================
   Provider Health Checker — Ver7.4
   ONLINE / OFFLINE / ERROR / WAITING / UNKNOWN
   ======================================== */

import { PROVIDER_HEALTH } from "./provider-interface.js";
import { logProviderEvent } from "./provider-logger.js";

const healthMap = new Map();

export function setProviderHealth(providerId, health, detail = {}) {
  const entry = {
    providerId,
    health: normalizeHealth(health),
    checkedAt: new Date().toISOString(),
    ...detail,
  };
  healthMap.set(providerId, entry);
  return entry;
}

export function getProviderHealth(providerId) {
  return (
    healthMap.get(providerId) || {
      providerId,
      health: PROVIDER_HEALTH.UNKNOWN,
      checkedAt: null,
    }
  );
}

export function getAllProviderHealth() {
  return [...healthMap.values()];
}

export async function checkProviderHealth(provider) {
  if (!provider) {
    return { health: PROVIDER_HEALTH.UNKNOWN, ok: false };
  }

  setProviderHealth(provider.id, PROVIDER_HEALTH.WAITING);

  try {
    if (!provider.enabled) {
      return setProviderHealth(provider.id, PROVIDER_HEALTH.OFFLINE, {
        note: "disabled",
      });
    }
    if (!provider.implemented) {
      return setProviderHealth(provider.id, PROVIDER_HEALTH.OFFLINE, {
        note: "Provider未接続",
      });
    }

    const started = performance.now();
    const ping = typeof provider.ping === "function" ? await provider.ping() : { ok: true };
    const latencyMs = Math.round(performance.now() - started);

    if (ping?.ok === false) {
      const entry = setProviderHealth(provider.id, PROVIDER_HEALTH.OFFLINE, {
        note: ping.note || "ping failed",
        latencyMs,
      });
      logProviderEvent("health", {
        providerId: provider.id,
        message: entry.note,
        health: entry.health,
      });
      return entry;
    }

    const entry = setProviderHealth(provider.id, PROVIDER_HEALTH.ONLINE, {
      latencyMs,
      note: "ok",
    });
    provider.setHealth?.(PROVIDER_HEALTH.ONLINE);
    return entry;
  } catch (err) {
    const entry = setProviderHealth(provider.id, PROVIDER_HEALTH.ERROR, {
      note: err?.message || "health check error",
    });
    provider.setHealth?.(PROVIDER_HEALTH.ERROR);
    logProviderEvent("health_error", {
      providerId: provider.id,
      message: entry.note,
      health: entry.health,
    });
    return entry;
  }
}

export async function checkAllProviders(providers = []) {
  const rows = [];
  for (const p of providers) {
    rows.push(await checkProviderHealth(p));
  }
  return rows;
}

function normalizeHealth(health) {
  const h = String(health || "").toUpperCase();
  return PROVIDER_HEALTH[h] || PROVIDER_HEALTH.UNKNOWN;
}

export const ProviderHealthChecker = {
  check: checkProviderHealth,
  checkAll: checkAllProviders,
  get: getProviderHealth,
  getAll: getAllProviderHealth,
  set: setProviderHealth,
  HEALTH: PROVIDER_HEALTH,
};
