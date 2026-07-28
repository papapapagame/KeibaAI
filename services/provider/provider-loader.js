/* ========================================
   Provider Loader — Ver7.4
   ======================================== */

import {
  ensureRegistry,
  getEnabledProviders,
  getProvider,
  getRegisteredProviders,
} from "./provider-registry.js";
import { sortProvidersByPriority } from "./priority.js";
import { getSourceMode } from "../data/source-mode.js";
import { logProviderEvent } from "./provider-logger.js";

/**
 * Source Mode と Priority に従い、試行順の Provider リストを返す
 */
export function loadProvidersForKind(dataKind = "Bundle", options = {}) {
  ensureRegistry();
  const mode = options.mode || getSourceMode();
  const all = getRegisteredProviders();
  const sorted = sortProvidersByPriority(all, dataKind);

  let candidates = [];
  if (mode === "mock") {
    candidates = sorted.filter((p) => p.id === "mock" && p.enabled && p.implemented);
  } else if (mode === "real") {
    candidates = sorted.filter(
      (p) => p.id !== "mock" && p.enabled && p.implemented
    );
  } else {
    // auto: real 実装 → mock フォールバック
    const reals = sorted.filter(
      (p) => p.id !== "mock" && (p.enabled || p.implemented)
    );
    const mock = sorted.filter((p) => p.id === "mock" && p.enabled);
    candidates = [...reals.filter((p) => p.implemented), ...mock];
    // 実装なしの real は「試行して Failover」用に接続口だけ並べる
    if (!reals.some((p) => p.implemented)) {
      candidates = [
        ...reals.filter((p) => !p.implemented).slice(0, 2),
        ...mock,
      ];
    }
  }

  // 明示指定
  if (options.providerId) {
    const forced = getProvider(options.providerId);
    candidates = forced ? [forced] : [];
  }

  logProviderEvent("load", {
    message: `kind=${dataKind} mode=${mode} candidates=${candidates
      .map((p) => p.id)
      .join(",") || "(none)"}`,
  });

  return {
    mode,
    dataKind,
    providers: candidates,
    blocked: mode === "real" && !candidates.some((p) => p.implemented),
    blockReason:
      mode === "real" && !candidates.some((p) => p.implemented)
        ? "Provider未接続"
        : null,
  };
}

export function loadEnabledProviders() {
  ensureRegistry();
  return getEnabledProviders();
}

export const ProviderLoader = {
  loadForKind: loadProvidersForKind,
  loadEnabled: loadEnabledProviders,
};
