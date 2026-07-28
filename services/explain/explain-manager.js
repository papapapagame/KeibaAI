/* ========================================
   Explain Manager — Ver8.3
   ======================================== */

import {
  explainPrediction,
  EXPLAIN_ENGINE_VERSION,
  toAiExplainPayload,
} from "./prediction-explainer.js";
import {
  createExplain,
  createContribution,
  createPredictionDiff,
  createReason,
  createEvidence,
  createConfidence,
} from "../models/unified.js";

let lastResult = null;
let lastUpdatedAt = null;

/**
 * Build explainability package from Discussion + ranked prediction.
 */
export function loadExplainForAi(options = {}) {
  const result = explainPrediction({
    discussion: options.discussion || null,
    ranked: options.ranked || [],
    stage: options.stage,
    blendedConfidence: options.blendedConfidence,
    raceKey: options.raceKey || "",
    hasWeather: options.hasWeather,
    hasNews: options.hasNews,
    hasSocial: options.hasSocial,
    hasLearning: options.hasLearning,
  });

  lastResult = result;
  lastUpdatedAt = result.updatedAt || new Date().toISOString();

  return {
    ...result,
    unified: toUnified(result),
    fetchedAt: lastUpdatedAt,
    stageNote: result.ok
      ? "Discussion 採用 Evidence に基づく説明（推測なし）"
      : result.message || "説明未生成",
  };
}

export function getExplainDashboard() {
  return {
    version: EXPLAIN_ENGINE_VERSION,
    result: lastResult,
    updatedAt: lastUpdatedAt,
    status: lastResult?.status || null,
    validation: lastResult?.validation || null,
    contributions: lastResult?.contributions || null,
    diff: lastResult?.diff || null,
  };
}

export function toUnified(result) {
  if (!result?.ok || !result.display) {
    return createExplain({ available: false });
  }
  return createExplain({
    available: true,
    status: result.status?.label || "ok",
    overallReason: result.display.overallReason,
    contributions: (result.contributions?.items || []).map((c) =>
      createContribution(c)
    ),
    reasons: [
      createReason({
        type: "overall",
        text: result.reasons?.overall?.text || "",
      }),
      ...(result.reasons?.plus || []).map((r) =>
        createReason({ type: "plus", text: r.text, evidenceId: r.evidenceId })
      ),
      ...(result.reasons?.minus || []).map((r) =>
        createReason({ type: "minus", text: r.text, evidenceId: r.evidenceId })
      ),
    ],
    evidence: [
      ...(result.evidenceView?.adopted || []).map((e) =>
        createEvidence({ ...e, role: "adopted" })
      ),
      ...(result.evidenceView?.excluded || []).map((e) =>
        createEvidence({ ...e, role: "excluded" })
      ),
    ],
    confidence: createConfidence(result.confidenceExplainer || {}),
    diff: createPredictionDiff(result.diff || {}),
    aiPayload: result.aiExplain || toAiExplainPayload(result),
    validation: result.validation || null,
    stage: result.stage,
    updatedAt: result.updatedAt || null,
    version: result.version || EXPLAIN_ENGINE_VERSION,
  });
}

export { EXPLAIN_ENGINE_VERSION };

export const ExplainManager = {
  loadForAi: loadExplainForAi,
  dashboard: getExplainDashboard,
  toUnified,
  version: EXPLAIN_ENGINE_VERSION,
};
