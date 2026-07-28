/* ========================================
   Confidence Explainer — Ver8.3
   Discussion Consensus に基づく Confidence 理由
   ======================================== */

export function explainConfidence(discussion = null, context = {}) {
  const consensus = discussion?.consensus || {};
  const stage = Number(context.stage) || 0;
  const blended = context.blendedConfidence;

  const finalConfidence =
    blended != null
      ? Number(blended)
      : consensus.finalConfidence != null
        ? Number(consensus.finalConfidence)
        : null;

  const details = [];
  if (consensus.consensusScore != null) {
    details.push({
      key: "consensus",
      label: "Consensus Score",
      value: consensus.consensusScore,
      text: `合意度 ${consensus.consensusScore}（採用 Evidence の質を重視）`,
    });
  }
  if (consensus.agreementScore != null) {
    details.push({
      key: "agreement",
      label: "Agreement Score",
      value: consensus.agreementScore,
      text: `一致度 ${consensus.agreementScore}`,
    });
  }
  if (consensus.conflictScore != null) {
    details.push({
      key: "conflict",
      label: "Conflict Score",
      value: consensus.conflictScore,
      text: `矛盾度 ${consensus.conflictScore}${
        consensus.conflictScore >= 40 ? "（矛盾あり・信頼度を抑制）" : ""
      }`,
    });
  }
  details.push({
    key: "stage",
    label: "Analysis Stage",
    value: stage,
    text: `Stage${stage} の確定情報量を Confidence に反映`,
  });

  const excluded = discussion?.reasoning?.excluded || [];
  if (excluded.length) {
    details.push({
      key: "excluded",
      label: "Excluded Evidence",
      value: excluded.length,
      text: `除外 Evidence ${excluded.length}件を Confidence 計算から外しています`,
    });
  }

  const summary =
    finalConfidence != null
      ? `Final Confidence ${finalConfidence}% — Consensus ${consensus.consensusScore ?? "—"} / Agreement ${consensus.agreementScore ?? "—"} / Conflict ${consensus.conflictScore ?? "—"}（Stage${stage}）`
      : "Confidence を算出できませんでした。";

  return {
    finalConfidence,
    consensusScore: consensus.consensusScore ?? null,
    agreementScore: consensus.agreementScore ?? null,
    conflictScore: consensus.conflictScore ?? null,
    stage,
    summary,
    details,
  };
}

export const ConfidenceExplainer = { explain: explainConfidence };
