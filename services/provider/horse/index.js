/* ========================================
   Real Horse Entry Provider API — Ver10.1
   ======================================== */

export {
  RealHorseProvider,
  loadRealHorseEntries,
  RealHorseProviderApi,
  REAL_HORSE_PROVIDER_ID,
  REAL_HORSE_PROVIDER_VERSION,
} from "./real-horse-provider.js";

export {
  HorseEntryFetcher,
  fetchHorseEntryRaw,
  HORSE_ENTRY_FETCHER_VERSION,
} from "./horse-entry-fetcher.js";

export {
  HorseEntryParser,
  parseHorseEntryRaw,
  HORSE_ENTRY_PARSER_VERSION,
} from "./horse-entry-parser.js";

export {
  HorseEntryNormalizer,
  normalizeHorseEntries,
  HORSE_ENTRY_NORMALIZER_VERSION,
} from "./horse-entry-normalizer.js";

export {
  HorseEntryValidator,
  validateHorseEntries,
  HORSE_ENTRY_VALIDATOR_VERSION,
} from "./horse-entry-validator.js";

export {
  HorseEntrySynchronizer,
  syncHorseEntries,
  getRealHorseState,
  clearRealHorseState,
  getRealHorseDashboard,
  fingerprintHorseEntries,
  diffHorseEntryChanges,
  HORSE_ENTRY_SYNC_VERSION,
} from "./horse-entry-synchronizer.js";
