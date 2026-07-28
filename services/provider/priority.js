/* ========================================
   Provider Priority — Ver7.4
   データ種別ごとの優先順位
   ======================================== */

/**
 * 小さい数値ほど優先度が高い
 * Mock は最終フォールバック
 */
export const DEFAULT_PRIORITY_CHAINS = {
  Race: ["jra", "jbis", "netkeiba", "keibalab", "mock"],
  Horse: ["jra", "jbis", "netkeiba", "mock"],
  Jockey: ["jra", "jbis", "netkeiba", "mock"],
  Trainer: ["jra", "jbis", "netkeiba", "mock"],
  Odds: ["jra", "market", "netkeiba", "mock"],
  Weather: ["jra", "netkeiba", "mock"],
  TrackCondition: ["jra", "netkeiba", "mock"],
  News: ["news", "netkeiba", "mock"],
  Review: ["keibalab", "news", "mock"],
  Market: ["market", "social", "news", "mock"],
  Bundle: ["jra", "jbis", "netkeiba", "keibalab", "mock"],
};

let customChains = {};

export function getPriorityChain(dataKind = "Bundle") {
  const key = normalizeKind(dataKind);
  return [...(customChains[key] || DEFAULT_PRIORITY_CHAINS[key] || DEFAULT_PRIORITY_CHAINS.Bundle)];
}

export function setPriorityChain(dataKind, orderedIds = []) {
  const key = normalizeKind(dataKind);
  customChains[key] = orderedIds.filter(Boolean);
  return getPriorityChain(key);
}

export function resetPriorityChains() {
  customChains = {};
}

export function sortProvidersByPriority(providers = [], dataKind = "Bundle") {
  const chain = getPriorityChain(dataKind);
  const rank = new Map(chain.map((id, i) => [id, i]));
  return [...providers].sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id) : 1000 + (a.priority || 100);
    const rb = rank.has(b.id) ? rank.get(b.id) : 1000 + (b.priority || 100);
    return ra - rb;
  });
}

function normalizeKind(kind) {
  const s = String(kind || "Bundle");
  if (s.toLowerCase() === "bundle") return "Bundle";
  const found = Object.keys(DEFAULT_PRIORITY_CHAINS).find(
    (k) => k.toLowerCase() === s.toLowerCase()
  );
  return found || "Bundle";
}

export const ProviderPriority = {
  get: getPriorityChain,
  set: setPriorityChain,
  reset: resetPriorityChains,
  sort: sortProvidersByPriority,
  defaults: DEFAULT_PRIORITY_CHAINS,
};
