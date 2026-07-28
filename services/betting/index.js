/* ========================================
   PAPAPA IQ KEIBA - services/betting API
   Ver6.0 Betting Intelligence AI
   ======================================== */

export { runBettingEngine } from "./betting-engine.js";
export { analyzeValue } from "./value-analyzer.js";
export { analyzeRisk, riskLevelFromScore } from "./risk-analyzer.js";
export { generateTickets, estimatePoints } from "./ticket-generator.js";
export {
  optimizeCombinations,
  buildStrategyVariants,
} from "./combination-optimizer.js";
export {
  allocateBankroll,
  distributeToTickets,
  BUDGET_PRESETS,
} from "./bankroll-manager.js";
export { explainTicket, attachExplanations } from "./explain-betting.js";
export {
  saveBettingHistory,
  loadBettingHistory,
  saveBettingFavorite,
  loadBettingFavorites,
  ticketsToCsv,
  ticketsToJson,
  downloadText,
  copyText,
} from "./betting-storage.js";
