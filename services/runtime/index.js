/* ========================================
   Runtime / RC helpers — Ver9.0
   ======================================== */

export {
  ServiceGuard,
  guardAsync,
  guardSync,
  getErrorStats,
  clearErrorStats,
  recordError,
  recordWarning,
} from "./service-guard.js";

export {
  PrefetchDeduper,
  shouldPrefetch,
  clearPrefetchMemory,
  getPrefetchMemoryStats,
} from "./prefetch-deduper.js";

export {
  ProductionHealth,
  getProductionHealth,
  getProviderModeSnapshot,
  formatCurrentProviders,
  PRODUCTION_HEALTH_VERSION,
} from "./production-health.js";

export {
  ProviderIntegration,
  getProviderIntegrationReport,
  INTEGRATED_REAL_PROVIDER_IDS,
  PROVIDER_INTEGRATION_VERSION,
} from "./provider-integration.js";
