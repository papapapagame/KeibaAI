/* ========================================
   Evidence Explainer — Ver8.3
   Discussion の採用/除外 Evidence を説明用に整形
   ======================================== */

export function explainEvidence(discussion = null) {
  const reasoning = discussion?.reasoning || {};
  const adopted = (reasoning.adopted || []).map((e) => formatEvidence(e, "adopted"));
  const excluded = (reasoning.excluded || []).map((e) =>
    formatEvidence(e, "excluded")
  );
  const agreed = (reasoning.agreed || []).map((e) => formatEvidence(e, "agreed"));
  const conflicted = (reasoning.conflicted || []).map((e) =>
    formatEvidence(e, "conflicted")
  );

  const important = [...adopted]
    .sort(
      (a, b) =>
        (b.scores?.importance || 0) - (a.scores?.importance || 0) ||
        (b.scores?.confidence || 0) - (a.scores?.confidence || 0)
    )
    .slice(0, 6);

  return {
    adopted,
    excluded,
    agreed,
    conflicted,
    important,
    conflictReasons: reasoning.conflictReasons || [],
  };
}

function formatEvidence(e = {}, role = "") {
  return {
    id: e.id,
    role: role || e.role || "",
    source: e.source,
    sourceLabel: e.sourceLabel || e.source,
    claimType: e.claimType,
    claim: e.claim || "",
    horseNames: e.horseNames || [],
    polarity: e.polarity || "neutral",
    scores: e.scores || null,
    reason: e.reason || "",
  };
}

export const EvidenceExplainer = { explain: explainEvidence };
