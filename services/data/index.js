/* ========================================
   PAPAPA IQ KEIBA - services/data API
   Ver7.0 Real Data Platform Foundation
   ======================================== */

export {
  getRaceBundleForAi,
  fetchAnalysisBundleViaPlatform,
  getDataPlatformSnapshot,
  getSourceMode,
  setSourceMode,
  SOURCE_MODES,
  clearPlatformCache,
  getPlatformStatus,
  DataProviderManager,
  DATA_API_VERSION,
  formatUpdateTime,
} from "./api.js";

export {
  getDataDashboard,
  changeSourceMode,
  resetDataPlatformCache,
} from "./data-dashboard.js";

export {
  createRaceModel,
  createHorseModel,
  createJockeyModel,
  createTrainerModel,
  createOddsModel,
  createResultModel,
  createMarketModel,
  normalizeSurfaceDistance,
  UNIFIED_MODEL_VERSION,
} from "./unified-models.js";

export { DataNormalizer, normalizeBundle } from "./data-normalizer.js";
export { DataValidator, validateNormalized } from "./data-validator.js";
export { DataCacheManager } from "./data-cache-manager.js";
export { DataScheduler } from "./data-scheduler.js";
export { ProviderHealthMonitor } from "./provider-health-monitor.js";
export { ProviderSelector } from "./provider-selector.js";

export {
  createAllProviders,
  createProvider,
  listProviderIds,
  MockProvider,
  PROVIDER_STATUS,
} from "./providers/index.js";
