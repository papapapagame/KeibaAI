/* ========================================
   PAPAPA IQ KEIBA - Horse Entry Engine API
   Ver7.6
   ======================================== */

export {
  HorseEntryManager,
  loadEntriesForAi,
  filterEntriesForStage,
  entryToHorseModel,
  getEntryDashboard,
  refreshEntriesOnly,
} from "./horse-entry-manager.js";

export {
  EntryDataConnector,
  connectEntryData,
  fingerprintEntries,
  ENTRY_ENGINE_VERSION,
} from "./entry-data-connector.js";

export {
  EntrySynchronizer,
  HorseEntrySynchronizer,
  syncEntries,
  getEntryOverlay,
  clearEntryOverlay,
} from "./entry-synchronizer.js";

export {
  getEntryOverlay as getEntryOverlayStore,
  clearEntryOverlay as clearEntryOverlayStore,
} from "./entry-overlay.js";

export {
  EntryValidator,
  HorseEntryValidator,
  validateEntries,
} from "./entry-validator.js";

export {
  EntryRepository,
  HorseEntryRepository,
  fetchEntryRaw,
} from "./entry-repository.js";

export {
  EntryStateManager,
  HorseEntryStateManager,
  setEntryState,
  getEntryStateSnapshot,
  computeEntryStats,
  recordStatusChange,
  diffEntryStatuses,
  loadHistory as loadEntryHistory,
} from "./entry-state-manager.js";

export {
  HorseEntryFormatter,
  formatEntryStagePanel,
  usingDataForStage,
  pendingDataForStage,
  formatEntryStatusCounts,
  formatEntryLabel,
  formatEntrySummaryLine,
} from "./horse-entry-formatter.js";

export {
  HorseEntryCompleteness,
  computeEntryCompleteness,
  confidenceFromEntryCompleteness,
} from "./entry-completeness.js";

export {
  EntryStatus,
  HorseEntryStatus,
  ENTRY_STATUS,
  ENTRY_STATUS_LABEL,
  normalizeEntryStatus,
  isActiveEntry,
  isRemovedEntry,
  UNCONFIRMED_FIELDS,
} from "./entry-status.js";
