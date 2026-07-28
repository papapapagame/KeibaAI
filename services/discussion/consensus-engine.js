/* ========================================
   Consensus Engine — Ver8.2
   Consensus / Agreement / Conflict / Final Confidence
   （単純平均・単純加算ではない）
   ======================================== */

import { resolutionScore } from "./conflict-resolver.js";

/**
 * Build consensus from scored evidence + conflict resolution.
 */
export function buildConsensus(evidence = [], resolution = {}) {
  const list = (evidence || []).filter((e) => e.available);
  const adopted = new Set(resolution.adoptedIds || []);
  const excluded = new Set(resolution.excludedIds || []);
  const conflicts = resolution.conflicts || [];

  const adoptedEv = list.filter((e) => adopted.has(e.id));
  const excludedEv = list.filter((e) => excluded.has(e.id));

  const agreementScore = computeAgreement(list, conflicts);
  const conflictScore = computeConflictScore(conflicts, list.length);
  const consensusScore = computeConsensus(adoptedEv, agreementScore, conflictScore);
  const finalConfidence = computeFinalConfidence(
    adoptedEv,
    agreementScore,
    conflictScore,
    consensusScore
  );

  return {
    consensusScore,
    agreementScore,
    conflictScore,
    finalConfidence,
    adoptedCount: adoptedEv.length,
    excludedCount: excludedEv.length,
    evidenceCount: list.length,
    conflictCount: conflicts.length,
    // weighted contribution by resolution quality — not equal average
    adoptedWeights: adoptedEv.map((e) => ({
      id: e.id,
      source: e.source,
      weight: Math.round(resolutionScore(e)),
      confidence: e.scores?.confidence ?? 0,
    })),
  };
}

function computeAgreement(list, conflicts) {
  if (!list.length) return 0;
  const conflictedIds = new Set(
    conflicts.flatMap((c) => (c.members || []).map((m) => m.id))
  );
  const agreeing = list.filter((e) => !conflictedIds.has(e.id));
  // Weight by confidence rather than headcount average
  const agreeW = agreeing.reduce(
    (s, e) => s + (e.scores?.confidence || 0) * (e.weightBase || 0.5),
    0
  );
  const allW = list.reduce(
    (s, e) => s + (e.scores?.confidence || 0) * (e.weightBase || 0.5),
    0
  );
  if (allW <= 0) return 50;
  const ratio = agreeW / allW;
  // Penalize unresolved multi-source tension lightly via conflict count
  const penalty = Math.min(25, conflicts.length * 6);
  return clamp(Math.round(ratio * 100 - penalty + 10));
}

function computeConflictScore(conflicts, evidenceCount) {
  if (!conflicts.length) return 0;
  const severityW = { high: 28, medium: 18, low: 10 };
  const raw = conflicts.reduce(
    (s, c) => s + (severityW[c.severity] || 12),
    0
  );
  const density = evidenceCount
    ? (conflicts.length / evidenceCount) * 40
    : 0;
  return clamp(Math.round(raw + density));
}

function computeConsensus(adoptedEv, agreement, conflict) {
  if (!adoptedEv.length) return 0;
  // Confidence-weighted median-ish blend (sorted, pick upper mid) — not mean of all
  const confs = adoptedEv
    .map((e) => Number(e.scores?.confidence) || 0)
    .sort((a, b) => a - b);
  const mid = confs[Math.floor(confs.length * 0.6)] ?? confs[confs.length - 1];
  const topW = adoptedEv
    .slice()
    .sort((a, b) => resolutionScore(b) - resolutionScore(a))
    .slice(0, Math.max(1, Math.ceil(adoptedEv.length * 0.4)));
  const topAvg =
    topW.reduce((s, e) => s + (e.scores?.confidence || 0), 0) / topW.length;

  const base = mid * 0.45 + topAvg * 0.35 + agreement * 0.2;
  const penalty = conflict * 0.35;
  return clamp(Math.round(base - penalty));
}

function computeFinalConfidence(adoptedEv, agreement, conflict, consensus) {
  if (!adoptedEv.length) return 5;
  const rel =
    adoptedEv.reduce((s, e) => s + (e.scores?.reliability || 0), 0) /
    adoptedEv.length;
  const cov =
    adoptedEv.reduce((s, e) => s + (e.scores?.coverage || 0), 0) /
    adoptedEv.length;
  // Geometric-ish blend favoring reliability when conflict is high
  const conflictFactor = 1 - Math.min(0.45, conflict / 200);
  const score =
    consensus * 0.4 +
    agreement * 0.2 +
    rel * 0.25 +
    cov * 0.15;
  return clamp(Math.round(score * conflictFactor));
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export const ConsensusEngine = { build: buildConsensus };
