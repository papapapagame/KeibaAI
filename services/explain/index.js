/* ========================================
   PAPAPA IQ KEIBA - Prediction Explainability API
   Ver8.3
   ======================================== */

export {
  ExplainManager,
  EXPLAIN_ENGINE_VERSION,
  loadExplainForAi,
  getExplainDashboard,
  toUnified as explainToUnified,
} from "./explain-manager.js";

export {
  PredictionExplainer,
  explainPrediction,
  toAiExplainPayload,
} from "./prediction-explainer.js";

export {
  EvidenceExplainer,
  explainEvidence,
} from "./evidence-explainer.js";

export { ReasonBuilder, buildReasons } from "./reason-builder.js";

export {
  ContributionAnalyzer,
  analyzeContributions,
} from "./contribution-analyzer.js";

export {
  ConfidenceExplainer,
  explainConfidence,
} from "./confidence-explainer.js";

export {
  ExplanationValidator,
  validateExplanation,
} from "./explanation-validator.js";

export {
  PredictionDiffStore,
  loadPreviousSnapshot,
  saveSnapshot,
  buildSnapshot,
  buildPredictionDiff,
} from "./prediction-diff.js";

export {
  CONTRIBUTION_FACTOR,
  CONTRIBUTION_FACTOR_LABEL,
  ALL_FACTORS,
} from "./contribution-factors.js";
