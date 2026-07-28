/* ========================================
   Discussion Manager — Ver8.2
   ======================================== */

import {
  runDiscussion,
  applyDiscussionScoreAdjustments,
  DISCUSSION_ENGINE_VERSION,
  toAiDiscussionPayload,
} from "./discussion-engine.js";
import {
  createDiscussion,
  createEvidence,
  createConsensus,
  createConflict,
  createReasoning,
} from "../models/unified.js";
import { getLearningDashboard } from "../learning/index.js";

let lastResult = null;
let lastUpdatedAt = null;

/**
 * Run discussion from analysis context bundles.
 */
export function loadDiscussionForAi(options = {}) {
  let learningDashboard = options.learningDashboard || null;
  try {
    if (!learningDashboard) {
      learningDashboard = getLearningDashboard({ ensureDemo: false });
    }
  } catch {
    learningDashboard = null;
  }

  const result = runDiscussion({
    race: options.race || {},
    horses: options.horses || [],
    entryBundle: options.entryBundle || null,
    drawBundle: options.drawBundle || null,
    oddsBundle: options.oddsBundle || null,
    weatherBundle: options.weatherBundle || null,
    newsBundle: options.newsBundle || null,
    socialBundle: options.socialBundle || null,
    learningDashboard,
    intelPacket: options.intelPacket || null,
    marketResult: options.marketResult || null,
    engineResult: options.engineResult || null,
    fetchedAt: options.fetchedAt || new Date().toISOString(),
    now: options.now || Date.now(),
  });

  lastResult = result;
  lastUpdatedAt = result.updatedAt || new Date().toISOString();

  const unified = toUnified(result);

  return {
    ...result,
    unified,
    count: result.evidence?.length || 0,
    fetchedAt: lastUpdatedAt,
    stageNote:
      "各Evidenceを比較・矛盾解決し合意形成（単純平均・加算ではない）",
    confidenceHint: result.consensus?.finalConfidence ?? null,
  };
}

export function getDiscussionDashboard() {
  return {
    version: DISCUSSION_ENGINE_VERSION,
    result: lastResult,
    updatedAt: lastUpdatedAt,
    status: lastResult?.status || null,
    consensus: lastResult?.consensus || null,
    evidenceCount: lastResult?.evidence?.length || 0,
    conflictCount: lastResult?.conflicts?.length || 0,
    validation: lastResult?.validation || null,
  };
}

export function toUnified(result) {
  if (!result?.ok) {
    return createDiscussion({ available: false });
  }
  return createDiscussion({
    available: true,
    status: result.status?.label || "ok",
    evidence: (result.evidence || []).map((e) => createEvidence(e)),
    conflicts: (result.conflicts || []).map((c) => createConflict(c)),
    consensus: createConsensus(result.consensus || {}),
    reasoning: createReasoning(result.reasoning || {}),
    aiPayload: result.aiDiscussion || toAiDiscussionPayload(result),
    validation: result.validation || null,
    updatedAt: result.updatedAt || null,
    version: result.version || DISCUSSION_ENGINE_VERSION,
  });
}

export { applyDiscussionScoreAdjustments, DISCUSSION_ENGINE_VERSION };

export const DiscussionManager = {
  loadForAi: loadDiscussionForAi,
  dashboard: getDiscussionDashboard,
  applyScores: applyDiscussionScoreAdjustments,
  toUnified,
  version: DISCUSSION_ENGINE_VERSION,
};
