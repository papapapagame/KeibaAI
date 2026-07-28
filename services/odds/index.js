/* ========================================
   PAPAPA IQ KEIBA - Odds & Market Engine API
   Ver7.8
   ======================================== */

export {
  OddsManager,
  ODDS_ENGINE_VERSION,
  loadOddsForAi,
  mergeHorsesWithOdds,
  computeOddsConfirmedStage,
  getOddsDashboard,
  refreshOddsOnly,
} from "./odds-manager.js";

export { OddsRepository, fetchOddsRaw } from "./odds-repository.js";
export { OddsValidator, validateOdds } from "./odds-validator.js";
export {
  OddsSynchronizer,
  syncOdds,
  fingerprintOdds,
  getOddsOverlay,
  clearOddsOverlay,
} from "./odds-synchronizer.js";
export {
  OddsHistoryManager,
  recordOddsChange,
  loadOddsHistory,
  diffOdds,
  summarizeOddsTrend,
} from "./odds-history-manager.js";
export { MarketAnalyzer, analyzeMarket } from "./market-analyzer.js";
export {
  OddsCompleteness,
  OddsFormatter,
  OddsMerge,
  computeOddsCompleteness,
  confidenceFromOddsCompleteness,
  formatOddsStagePanel,
  mergeOddsOntoHorses,
  applyOddsMarketAdjustments,
} from "./odds-merge.js";
