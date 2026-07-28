/* ========================================
   Real Odds Provider API — Ver10.2
   ======================================== */

export {
  RealOddsProvider,
  loadRealOdds,
  RealOddsProviderApi,
  REAL_ODDS_PROVIDER_ID,
  REAL_ODDS_PROVIDER_VERSION,
} from "./real-odds-provider.js";

export {
  OddsFetcher,
  fetchOddsRawData,
  ODDS_FETCHER_VERSION,
} from "./odds-fetcher.js";

export {
  OddsParser,
  parseOddsRaw,
  ODDS_PARSER_VERSION,
} from "./odds-parser.js";

export {
  OddsNormalizer,
  normalizeRealOdds,
  ODDS_NORMALIZER_VERSION,
} from "./odds-normalizer.js";

export {
  OddsValidator,
  validateRealOdds,
  ODDS_PROVIDER_VALIDATOR_VERSION,
} from "./odds-validator.js";

export {
  OddsSynchronizer,
  syncRealOdds,
  getRealOddsState,
  clearRealOddsState,
  getRealOddsDashboard,
  fingerprintRealOdds,
  ODDS_PROVIDER_SYNC_VERSION,
} from "./odds-synchronizer.js";

export {
  OddsHistoryManager,
  appendOddsHistoryFromDiff,
  listRecentOddsHistory,
  getOddsUpdateCount,
  bumpOddsUpdateCount,
  ODDS_HISTORY_MANAGER_VERSION,
} from "./odds-history-manager.js";
