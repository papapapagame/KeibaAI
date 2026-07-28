/* ========================================
   Prediction Explainer — Ver8.3
   Discussion 結果を唯一の根拠として説明を生成
   ======================================== */

import { analyzeContributions } from "./contribution-analyzer.js";
import { explainEvidence } from "./evidence-explainer.js";
import { buildReasons } from "./reason-builder.js";
import { explainConfidence } from "./confidence-explainer.js";
import {
  buildSnapshot,
  buildPredictionDiff,
  loadPreviousSnapshot,
  saveSnapshot,
} from "./prediction-diff.js";
import { validateExplanation } from "./explanation-validator.js";

export const EXPLAIN_ENGINE_VERSION = "8.3.0";

/**
 * @param {object} context
 * @param {object} context.discussion — Discussion bundle (required basis)
 * @param {object[]} context.ranked
 * @param {number} context.stage
 * @param {number} [context.blendedConfidence]
 * @param {string} [context.raceKey]
 * @param {boolean} [context.hasWeather]
 * @param {boolean} [context.hasNews]
 * @param {boolean} [context.hasSocial]
 * @param {boolean} [context.hasLearning]
 */
export function explainPrediction(context = {}) {
  const discussion = context.discussion || null;
  const started = Date.now();

  if (!discussion?.ok) {
    return emptyResult("Discussion Engine の結果が無いため説明を生成できません。");
  }

  const evidenceView = explainEvidence(discussion);
  const contributions = analyzeContributions(discussion, {
    stage: context.stage,
    hasWeather: context.hasWeather,
    hasNews: context.hasNews,
    hasSocial: context.hasSocial,
    hasLearning: context.hasLearning,
  });

  const confidenceExplainer = explainConfidence(discussion, {
    stage: context.stage,
    blendedConfidence: context.blendedConfidence,
  });

  const reasons = buildReasons({
    discussion,
    evidenceView,
    contributions,
    ranked: context.ranked || [],
    stage: context.stage,
    confidenceExplainer,
  });

  const currentSnap = buildSnapshot({
    ranked: context.ranked || [],
    discussion,
    stage: context.stage,
    confidence: confidenceExplainer.finalConfidence,
    raceKey: context.raceKey || "",
  });
  const previous = loadPreviousSnapshot();
  const diff = buildPredictionDiff(currentSnap, previous);

  const payload = {
    version: EXPLAIN_ENGINE_VERSION,
    discussion,
    evidenceView,
    contributions,
    reasons,
    confidenceExplainer,
    diff,
    stage: Number(context.stage) || 0,
    updatedAt: new Date().toISOString(),
  };

  const validation = validateExplanation(payload);
  if (!validation.ok) {
    return {
      ok: false,
      version: EXPLAIN_ENGINE_VERSION,
      message: "Explanation Validation failed",
      validation,
      // 異常データは表示しない
      display: null,
      aiExplain: null,
      responseMs: Date.now() - started,
      updatedAt: payload.updatedAt,
    };
  }

  // persist AFTER successful validation (for next diff)
  saveSnapshot(currentSnap);

  const display = toDisplay(payload);
  const aiExplain = toAiExplainPayload(payload);

  return {
    ok: true,
    version: EXPLAIN_ENGINE_VERSION,
    message: "Explanation generated from Discussion Evidence",
    validation,
    evidenceView,
    contributions,
    reasons,
    confidenceExplainer,
    diff,
    stage: payload.stage,
    display,
    aiExplain,
    status: {
      label: "説明生成済",
      contributionTotal: contributions.totalPercent,
      evidenceAdopted: evidenceView.adopted?.length || 0,
      evidenceExcluded: evidenceView.excluded?.length || 0,
      finalConfidence: confidenceExplainer.finalConfidence,
    },
    responseMs: Date.now() - started,
    updatedAt: payload.updatedAt,
  };
}

function toDisplay(payload) {
  return {
    overallReason: payload.reasons?.overall?.text || "",
    important: (payload.reasons?.important || []).map((r) => r.text),
    contributions: (payload.contributions?.items || []).map((c) => ({
      label: c.label,
      percent: c.percent,
    })),
    confidenceReason: payload.confidenceExplainer?.summary || "",
    confidenceDetails: (payload.confidenceExplainer?.details || []).map(
      (d) => d.text
    ),
    stage: payload.stage,
    stageReason: payload.reasons?.stage?.text || "",
    plus: (payload.reasons?.plus || []).map((r) => r.text),
    minus: (payload.reasons?.minus || []).map((r) => r.text),
    horses: payload.reasons?.horses || [],
    diffHighlights: payload.diff?.highlights || [],
    rankChanges: payload.diff?.rankChanges || [],
    newEvidence: payload.diff?.newEvidence || [],
    removedEvidence: payload.diff?.removedEvidence || [],
    adoptedEvidence: (payload.evidenceView?.adopted || []).map(
      (e) => `[${e.sourceLabel}] ${e.claim}`
    ),
    excludedEvidence: (payload.evidenceView?.excluded || []).map(
      (e) => `[${e.sourceLabel}] ${e.claim}`
    ),
  };
}

export function toAiExplainPayload(payload = {}) {
  return {
    available: true,
    overallReason: payload.reasons?.overall?.text || "",
    importantEvidence: payload.evidenceView?.important || [],
    adopted: payload.evidenceView?.adopted || [],
    excluded: payload.evidenceView?.excluded || [],
    contributions: payload.contributions?.items || [],
    contributionTotal: payload.contributions?.totalPercent ?? null,
    confidence: payload.confidenceExplainer || null,
    stage: payload.stage,
    horseReasons: payload.reasons?.horses || [],
    plus: payload.reasons?.plus || [],
    minus: payload.reasons?.minus || [],
    diff: payload.diff || null,
  };
}

function emptyResult(message) {
  return {
    ok: false,
    version: EXPLAIN_ENGINE_VERSION,
    message,
    validation: {
      ok: false,
      errors: [{ code: "DISCUSSION", message }],
      warnings: [],
    },
    display: null,
    aiExplain: null,
    status: { label: "未生成" },
    updatedAt: new Date().toISOString(),
  };
}

export const PredictionExplainer = {
  explain: explainPrediction,
  toAi: toAiExplainPayload,
  version: EXPLAIN_ENGINE_VERSION,
};
