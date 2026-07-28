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
  syncEntries,
  getEntryOverlay,
  clearEntryOverlay,
} from "./entry-synchronizer.js";

export { EntryValidator, validateEntries } from "./entry-validator.js";
export { EntryRepository, fetchEntryRaw } from "./entry-repository.js";

export {
  EntryStateManager,
  setEntryState,
  getEntryStateSnapshot,
  computeEntryStats,
  recordStatusChange,
  diffEntryStatuses,
  loadHistory as loadEntryHistory,
} from "./entry-state-manager.js";

export {
  EntryStatus,
  ENTRY_STATUS,
  ENTRY_STATUS_LABEL,
  normalizeEntryStatus,
  isActiveEntry,
  isRemovedEntry,
  UNCONFIRMED_FIELDS,
} from "./entry-status.js";
