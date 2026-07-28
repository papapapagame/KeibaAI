/* ========================================
   Provider Registry — Ver7.4 / Ver10.0
   Mock + Real Race を登録。既定は Mock 有効。
   ======================================== */

import { createProvider, listFactoryIds } from "./provider-factory.js";
import { logProviderEvent } from "./provider-logger.js";
import { REAL_RACE_PROVIDER_ID } from "./race/real-race-provider.js";
import { REAL_HORSE_PROVIDER_ID } from "./horse/real-horse-provider.js";
import { REAL_ODDS_PROVIDER_ID } from "./odds/real-odds-provider.js";
import { REAL_WEATHER_PROVIDER_ID } from "./weather/real-weather-provider.js";

/** @type {Map<string, import("./provider-interface.js").ProviderInterface>} */
const registry = new Map();
let initialized = false;

export function ensureRegistry() {
  if (!initialized) {
    for (const id of listFactoryIds()) {
      const provider = createProvider(id);
      if (!provider) continue;
      if (
        id === "mock" ||
        id === REAL_RACE_PROVIDER_ID ||
        id === REAL_HORSE_PROVIDER_ID ||
        id === REAL_ODDS_PROVIDER_ID ||
        id === REAL_WEATHER_PROVIDER_ID
      ) {
        provider.enabled = true;
      } else {
        provider.enabled = false;
      }
      registry.set(id, provider);
    }
    initialized = true;
    logProviderEvent("registry_init", {
      message: `registered ${registry.size} providers (mock + real-race + real-horse + real-odds + real-weather)`,
    });
  }
  return [...registry.values()];
}

export function registerProvider(provider, { enable = null } = {}) {
  if (!provider?.id) return null;
  if (enable != null) provider.enabled = Boolean(enable);
  registry.set(provider.id, provider);
  initialized = true;
  logProviderEvent("register", {
    providerId: provider.id,
    message: `registered (enabled=${provider.enabled})`,
  });
  return provider;
}

export function unregisterProvider(id) {
  const ok = registry.delete(String(id || ""));
  if (ok) {
    logProviderEvent("unregister", { providerId: id, message: "unregistered" });
  }
  return ok;
}

export function getProvider(id) {
  ensureRegistry();
  return registry.get(String(id || "")) || null;
}

export function getRegisteredProviders() {
  return ensureRegistry();
}

export function getEnabledProviders() {
  return getRegisteredProviders().filter((p) => p.enabled);
}

export function setProviderEnabled(id, enabled) {
  const p = getProvider(id);
  if (!p) return null;
  // Real stubs は implemented=false のため有効化しても取得不可
  p.enabled = Boolean(enabled);
  logProviderEvent("enable", {
    providerId: id,
    message: `enabled=${p.enabled}`,
  });
  return p;
}

export function listRegistryMetas() {
  return getRegisteredProviders().map((p) => p.getMeta());
}

export function resetRegistry() {
  registry.clear();
  initialized = false;
  return ensureRegistry();
}

export const ProviderRegistry = {
  ensure: ensureRegistry,
  register: registerProvider,
  unregister: unregisterProvider,
  get: getProvider,
  list: getRegisteredProviders,
  enabled: getEnabledProviders,
  setEnabled: setProviderEnabled,
  metas: listRegistryMetas,
  reset: resetRegistry,
};
