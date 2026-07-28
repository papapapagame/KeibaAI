/* ========================================
   Provider Registry — Ver7.4
   Mock のみ有効。他は登録・無効。
   ======================================== */

import { createProvider, listFactoryIds } from "./provider-factory.js";
import { logProviderEvent } from "./provider-logger.js";

/** @type {Map<string, import("./provider-interface.js").ProviderInterface>} */
const registry = new Map();
let initialized = false;

export function ensureRegistry() {
  if (initialized) return getRegisteredProviders();
  for (const id of listFactoryIds()) {
    const provider = createProvider(id);
    if (!provider) continue;
    // Ver7.4: Mock のみ有効
    provider.enabled = id === "mock";
    registry.set(id, provider);
  }
  initialized = true;
  logProviderEvent("registry_init", {
    message: `registered ${registry.size} providers (mock enabled)`,
  });
  return getRegisteredProviders();
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
  ensureRegistry();
  return [...registry.values()];
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
