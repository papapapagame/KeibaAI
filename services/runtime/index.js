/* ========================================
   Runtime / RC helpers — Ver9.0 / Ver10.7
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

export {
  LiveHttpClient,
  liveFetch,
  liveFetchJson,
  liveFetchText,
  formatUserError,
  LIVE_HTTP_CLIENT_VERSION,
} from "./live-http-client.js";

export {
  ConnectionTelemetry,
  recordConnection,
  recordMockUsage,
  recordAiPayloadCount,
  getConnectionTelemetry,
  clearConnectionTelemetry,
  CONNECTION_TELEMETRY_VERSION,
} from "./connection-telemetry.js";

export {
  HttpCache,
  getHttpCacheEntry,
  setHttpCacheEntry,
  clearHttpCache,
  getHttpCacheStats,
  HTTP_CACHE_VERSION,
} from "./http-cache.js";
