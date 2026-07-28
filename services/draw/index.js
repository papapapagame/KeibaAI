/* ========================================
   PAPAPA IQ KEIBA - Draw & Jockey Engine API
   Ver7.7
   ======================================== */

export {
  DrawManager,
  DRAW_ENGINE_VERSION,
  loadDrawForAi,
  mergeHorsesWithDraw,
  computeConfirmedStage,
  getDrawDashboard,
  refreshDrawOnly,
} from "./draw-manager.js";

export { DrawRepository, fetchDrawRaw } from "./draw-repository.js";
export { DrawValidator, validateDraws } from "./draw-validator.js";
export {
  DrawSynchronizer,
  syncDraws,
  fingerprintDraws,
  getDrawOverlay,
  clearDrawOverlay,
} from "./draw-synchronizer.js";
export {
  DrawStateManager,
  setDrawState,
  getDrawStateSnapshot,
  computeDrawStats,
  recordDrawChange,
  diffDraws,
  loadDrawHistory,
} from "./draw-state-manager.js";
export {
  JockeyManager,
  extractJockeyRecords,
  jockeyStatusSummary,
  resolveConfirmedJockey,
} from "./jockey-manager.js";
export {
  WeightManager,
  extractWeightRecords,
  weightStatusSummary,
  resolveConfirmedWeight,
} from "./weight-manager.js";
export {
  DrawAdjustment,
  mergeDrawOntoHorses,
  buildAdjustments,
  applyDrawScoreAdjustments,
} from "./draw-adjustment.js";
export {
  DrawCompleteness,
  computeDrawCompleteness,
  confidenceFromDrawCompleteness,
} from "./draw-completeness.js";
export {
  DrawFormatter,
  formatDrawStagePanel,
  acquiredDataForStage,
  pendingDataForStage,
} from "./draw-formatter.js";
