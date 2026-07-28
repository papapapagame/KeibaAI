/* ========================================
   PAPAPA IQ KEIBA - Provider Framework API
   Ver7.4 Provider Integration Framework
   ======================================== */

export {
  ProviderInterface,
  PROVIDER_HEALTH,
  PROVIDER_DATA_KINDS,
  PROVIDER_VERSION,
} from "./provider-interface.js";

export {
  ProviderManager,
  acquire,
  acquireBundle,
  getFrameworkStatus,
  getFrameworkDashboard,
  refreshProviderHealth,
  PROVIDER_FRAMEWORK_VERSION,
} from "./provider-manager.js";

export {
  ProviderRegistry,
  ensureRegistry,
  registerProvider,
  getProvider,
  getRegisteredProviders,
  getEnabledProviders,
  setProviderEnabled,
  listRegistryMetas,
} from "./provider-registry.js";

export {
  ProviderFactory,
  createProvider,
  createAllProviders,
  listFactoryIds,
} from "./provider-factory.js";

export {
  ProviderLoader,
  loadProvidersForKind,
  loadEnabledProviders,
} from "./provider-loader.js";

export {
  ProviderHealthChecker,
  checkProviderHealth,
  checkAllProviders,
  getProviderHealth,
  getAllProviderHealth,
} from "./provider-health-checker.js";

export {
  ProviderLogger,
  logProviderEvent,
  getProviderLogs,
  clearProviderLogs,
} from "./provider-logger.js";

export {
  ProviderPriority,
  getPriorityChain,
  setPriorityChain,
  sortProvidersByPriority,
  DEFAULT_PRIORITY_CHAINS,
} from "./priority.js";

export { DataMerge, mergeProviderResults } from "./data-merge.js";
export {
  DataProvenance,
  createProvenance,
  attachProvenance,
  extractProvenance,
} from "./data-provenance.js";

export { MockProvider } from "./providers/mock-provider.js";
export * from "./race/index.js";
export * from "./horse/index.js";
