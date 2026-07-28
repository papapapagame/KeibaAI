/* ========================================
   PAPAPA IQ KEIBA - Intelligence Platform API
   Ver5.2 Real Intelligence Connect
   ======================================== */

export {
  initIntelligenceManager,
  registerProvider,
  setProviderEnabled,
  setProviderPriority,
  getProviderMetas,
  getProviderStatusMap,
  collectIntelligence,
  getFetchLogs,
  clearFetchLogs,
  clearProviderCache,
  clearAllIntelligenceState,
  getLastCollectAt,
  getDebugSnapshot,
  getProviderMonitor,
} from "./intelligence-manager.js";

export {
  buildIntelligencePacket,
  buildDummyScores,
} from "./intelligence-layer.js";

export {
  normalizeProviderItems,
  mergeNormalized,
} from "./data-normalizer.js";

export { preprocessForAi } from "./preprocess/ai-preprocessor.js";
export { validateIntelligenceItems } from "./validators/data-validator.js";
export {
  readIntelCache,
  writeIntelCache,
  clearIntelCache,
  listIntelCacheMeta,
  isCacheExpired,
} from "./cache/intelligence-cache.js";
export { getMonitorRows, clearMonitorStats } from "./monitor/provider-monitor.js";

export {
  buildXSearchQueries,
  prepareXSignalsForAi,
} from "./x-analysis.js";

export {
  buildNewsFetchPlan,
  prepareNewsForAi,
  NEWS_CATEGORIES,
} from "./news-analysis.js";

export { PROVIDER_STATUS } from "./providers/base-intelligence-provider.js";
export { createDefaultProviders } from "./providers/index.js";

export { collectRaces, collectRace } from "./collectors/race-collector.js";
export {
  collectHorses,
  collectHorse,
  collectOddsFromHorses,
} from "./collectors/horse-collector.js";
export { collectHistory, collectHistoryRow } from "./collectors/history-collector.js";
