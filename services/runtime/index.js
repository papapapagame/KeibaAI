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
} from "./prefetch-deduper.js";
