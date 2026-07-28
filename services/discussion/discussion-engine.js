/* ========================================
   Discussion Engine — Ver8.2
   Evidence比較 → 矛盾解決 → 合意 → 推論
   ======================================== */

import { collectEvidence } from "./evidence-collector.js";
import { resolveConflicts } from "./conflict-resolver.js";
import { buildConsensus } from "./consensus-engine.js";
import { buildReasoning } from "./reasoning-builder.js";
import { validateDiscussionPayload } from "./discussion-validator.js";

export const DISCUSSION_ENGINE_VERSION = "8.2.0";

/**
 * Run full discussion pipeline.
 * Does NOT mutate ai-engine / thinking-engine.
 */
export function runDiscussion(context = {}) {
  const started = Date.now();
  const evidence = collectEvidence(context);
  const resolution = resolveConflicts(evidence);
  const consensus = buildConsensus(evidence, resolution);
  const reasoning = buildReasoning(evidence, resolution, consensus);

  const payload = {
    version: DISCUSSION_ENGINE_VERSION,
    evidence,
    conflicts: resolution.conflicts,
    resolutions: resolution.resolutions,
    consensus,
    reasoning,
    updatedAt: new Date().toISOString(),
  };

  const validation = validateDiscussionPayload(payload);
  if (!validation.ok) {
    return {
      ok: false,
      version: DISCUSSION_ENGINE_VERSION,
      message: "Discussion Validation failed",
      validation,
      evidence: [],
      conflicts: [],
      consensus: emptyConsensus(),
      reasoning: emptyReasoning(),
      aiDiscussion: null,
      responseMs: Date.now() - started,
      updatedAt: payload.updatedAt,
    };
  }

  const aiDiscussion = toAiDiscussionPayload(payload);

  return {
    ok: true,
    version: DISCUSSION_ENGINE_VERSION,
    message: "Discussion completed",
    validation,
    evidence,
    conflicts: resolution.conflicts,
    resolutions: resolution.resolutions,
    consensus,
    reasoning,
    aiDiscussion,
    status: buildStatus(payload, validation),
    responseMs: Date.now() - started,
    updatedAt: payload.updatedAt,
  };
}

/** AI / Unified 向け（投稿本文等なし） */
export function toAiDiscussionPayload(payload = {}) {
  const c = payload.consensus || {};
  const r = payload.reasoning || {};
  return {
    available: true,
    evidenceCount: (payload.evidence || []).length,
    conflictCount: (payload.conflicts || []).length,
    consensusScore: c.consensusScore ?? null,
    agreementScore: c.agreementScore ?? null,
    conflictScore: c.conflictScore ?? null,
    finalConfidence: c.finalConfidence ?? null,
    agreed: (r.agreed || []).map(compactEvidence),
    conflicted: (r.conflicted || []).map(compactEvidence),
    adopted: (r.adopted || []).map(compactEvidence),
    excluded: (r.excluded || []).map(compactEvidence),
    conflictReasons: r.conflictReasons || [],
    judgment: r.judgment || null,
    narrative: r.narrative || "",
  };
}

function compactEvidence(e = {}) {
  return {
    id: e.id,
    source: e.source,
    sourceLabel: e.sourceLabel,
    claimType: e.claimType,
    claim: e.claim,
    horseNames: e.horseNames || [],
    polarity: e.polarity,
    scores: e.scores,
    reason: e.reason,
    role: e.role,
  };
}

function buildStatus(payload, validation) {
  const c = payload.consensus || {};
  return {
    label:
      validation.ok
        ? c.conflictScore >= 40
          ? "議論中（矛盾あり）"
          : "合意形成済"
        : "検証失敗",
    evidenceCount: (payload.evidence || []).length,
    consensusScore: c.consensusScore ?? null,
    conflictScore: c.conflictScore ?? null,
    finalConfidence: c.finalConfidence ?? null,
  };
}

function emptyConsensus() {
  return {
    consensusScore: 0,
    agreementScore: 0,
    conflictScore: 0,
    finalConfidence: 0,
    adoptedCount: 0,
    excludedCount: 0,
    evidenceCount: 0,
    conflictCount: 0,
  };
}

function emptyReasoning() {
  return {
    agreed: [],
    conflicted: [],
    adopted: [],
    excluded: [],
    conflictReasons: [],
    narrative: "",
    judgment: null,
  };
}

/**
 * Light display-score nudge from adopted/excluded horse signals.
 * Does not rewrite AI engine internals.
 */
export function applyDiscussionScoreAdjustments(ranked = [], discussion = null) {
  if (!discussion?.ok || !discussion.reasoning) return ranked;
  const adoptedPos = new Set();
  const adoptedNeg = new Set();
  for (const a of discussion.reasoning.adopted || []) {
    for (const name of a.horseNames || []) {
      if (a.polarity === "negative" || a.claimType === "scratch_signal") {
        adoptedNeg.add(name);
      } else if (a.polarity === "positive") {
        adoptedPos.add(name);
      }
    }
  }
  const excludedBuzz = new Set();
  for (const x of discussion.reasoning.excluded || []) {
    if (x.source === "social" || x.claimType === "buzz_signal") {
      (x.horseNames || []).forEach((n) => excludedBuzz.add(n));
    }
  }

  const conf = discussion.consensus?.finalConfidence ?? 50;
  const scale = conf >= 70 ? 1 : conf >= 50 ? 0.7 : 0.4;

  return (ranked || []).map((h) => {
    const name = h.horse || h.horseName || "";
    let delta = 0;
    if (adoptedNeg.has(name)) delta -= Math.round(2 * scale);
    if (adoptedPos.has(name) && !adoptedNeg.has(name)) delta += Math.round(1 * scale);
    if (excludedBuzz.has(name)) delta -= Math.round(1 * scale);
    delta = Math.max(-2, Math.min(2, delta));
    if (!delta) return h;
    const next = { ...h };
    if (next.thinking && typeof next.thinking.score === "number") {
      next.thinking = {
        ...next.thinking,
        score: Math.max(0, Math.min(100, next.thinking.score + delta)),
        discussionAux: { delta },
      };
    }
    if (next.indexes && typeof next.indexes.total === "number") {
      next.indexes = {
        ...next.indexes,
        total: Math.max(0, Math.min(100, next.indexes.total + delta)),
      };
    }
    return next;
  });
}

export const DiscussionEngine = {
  run: runDiscussion,
  toAi: toAiDiscussionPayload,
  applyScores: applyDiscussionScoreAdjustments,
  version: DISCUSSION_ENGINE_VERSION,
};
