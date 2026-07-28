/* ========================================
   Reasoning Builder — Ver8.2
   一致・矛盾・採用・除外を保持
   ======================================== */

export function buildReasoning(evidence = [], resolution = {}, consensus = {}) {
  const byId = new Map((evidence || []).map((e) => [e.id, e]));
  const adoptedIds = resolution.adoptedIds || [];
  const excludedIds = resolution.excludedIds || [];
  const conflicts = resolution.conflicts || [];
  const conflictedIds = new Set(
    conflicts.flatMap((c) => (c.members || []).map((m) => m.id))
  );

  const agreed = (evidence || []).filter(
    (e) =>
      e.available &&
      adoptedIds.includes(e.id) &&
      !conflictedIds.has(e.id)
  );
  const conflicted = (evidence || []).filter((e) => conflictedIds.has(e.id));
  const adopted = adoptedIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((e) => summarize(e, "adopted"));
  const excluded = excludedIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((e) => {
      const cf = conflicts.find((c) => (c.excludedIds || []).includes(e.id));
      return summarize(e, "excluded", cf?.reason || "信頼度・鮮度・重要度・取得率比較により除外");
    });

  const narrative = [
    `Evidence ${evidence.length}件を比較。`,
    `一致 ${agreed.length} / 矛盾グループ ${conflicts.length} / 採用 ${adopted.length} / 除外 ${excluded.length}。`,
    `Consensus ${consensus.consensusScore ?? "—"} / Agreement ${consensus.agreementScore ?? "—"} / Conflict ${consensus.conflictScore ?? "—"} / Final Confidence ${consensus.finalConfidence ?? "—"}。`,
  ].join(" ");

  return {
    agreed: agreed.map((e) => summarize(e, "agreed")),
    conflicted: conflicted.map((e) => summarize(e, "conflicted")),
    adopted,
    excluded,
    conflictReasons: conflicts.map((c) => ({
      id: c.id,
      claimType: c.claimType,
      adoptedId: c.adoptedId,
      reason: c.reason,
      severity: c.severity,
    })),
    narrative,
    // AI-facing structured judgment (no raw article/SNS bodies)
    judgment: {
      consensusScore: consensus.consensusScore ?? null,
      agreementScore: consensus.agreementScore ?? null,
      conflictScore: consensus.conflictScore ?? null,
      finalConfidence: consensus.finalConfidence ?? null,
      preferSources: adopted.slice(0, 5).map((a) => a.source),
      cautionSources: excluded.slice(0, 5).map((a) => a.source),
    },
  };
}

function summarize(e, role, reason = "") {
  return {
    id: e.id,
    role,
    source: e.source,
    sourceLabel: e.sourceLabel,
    claimType: e.claimType,
    claim: e.claim,
    subject: e.subject,
    horseNames: e.horseNames || [],
    polarity: e.polarity,
    scores: e.scores,
    reason: reason || undefined,
  };
}

export const ReasoningBuilder = { build: buildReasoning };
