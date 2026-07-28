/* ========================================
   Reason Builder — Ver8.3
   推測せず Discussion Evidence から理由文を構築
   ======================================== */

export function buildReasons(context = {}) {
  const discussion = context.discussion || null;
  const evidenceView = context.evidenceView || {};
  const contributions = context.contributions || {};
  const ranked = context.ranked || [];
  const stage = Number(context.stage) || 0;
  const confidence = context.confidenceExplainer || {};

  const overall = buildOverallReason(discussion, evidenceView, contributions, stage);
  const important = (evidenceView.important || []).map((e) => ({
    type: "important_evidence",
    text: `${e.sourceLabel}: ${e.claim}`,
    evidenceId: e.id,
    polarity: e.polarity,
  }));

  const plus = [];
  const minus = [];
  for (const e of evidenceView.adopted || []) {
    const entry = {
      type: e.polarity === "negative" ? "minus" : "plus",
      text: `${e.sourceLabel}: ${e.claim}`,
      evidenceId: e.id,
      horseNames: e.horseNames || [],
    };
    if (e.polarity === "negative" || e.claimType === "scratch_signal") {
      minus.push(entry);
    } else {
      plus.push(entry);
    }
  }

  const horseReasons = (ranked || []).slice(0, 8).map((h, idx) => {
    const name = h.horse || h.horseName || `${h.number}番`;
    const relatedAdopted = (evidenceView.adopted || []).filter((e) =>
      (e.horseNames || []).includes(name)
    );
    const relatedExcluded = (evidenceView.excluded || []).filter((e) =>
      (e.horseNames || []).includes(name)
    );
    const lines = [];
    if (idx === 0) {
      lines.push(`総合評価1位候補として採用 Evidence と整合。`);
    }
    relatedAdopted.forEach((e) => {
      lines.push(
        e.polarity === "negative"
          ? `減点根拠: ${e.claim}（${e.sourceLabel}）`
          : `加点根拠: ${e.claim}（${e.sourceLabel}）`
      );
    });
    relatedExcluded.forEach((e) => {
      lines.push(`除外された根拠: ${e.claim}（${e.sourceLabel}）`);
    });
    if (!lines.length) {
      lines.push(
        `個別に紐づく採用 Evidence は少ないが、総合寄与（${(contributions.topFactors || [])
          .slice(0, 2)
          .map((f) => f.label)
          .join("・") || "能力・近走"}）で順位付け。`
      );
    }
    return {
      number: h.number,
      horse: name,
      rank: idx + 1,
      score: h.thinking?.score ?? h.indexes?.total ?? null,
      reasons: lines,
      plus: relatedAdopted
        .filter((e) => e.polarity !== "negative")
        .map((e) => e.claim),
      minus: relatedAdopted
        .filter((e) => e.polarity === "negative" || e.claimType === "scratch_signal")
        .map((e) => e.claim),
    };
  });

  const contributionReasons = (contributions.items || []).slice(0, 8).map((c) => ({
    type: "contribution",
    factor: c.factor,
    text: `${c.label} ${c.percent}%`,
    percent: c.percent,
  }));

  const stageReason = {
    type: "stage",
    text: `Analysis Stage${stage} のため、確定度の高い情報源（枠・騎手・オッズ等）の寄与を段階に応じて反映しています。`,
    stage,
  };

  return {
    overall,
    important,
    plus: plus.slice(0, 8),
    minus: minus.slice(0, 8),
    horses: horseReasons,
    contributions: contributionReasons,
    stage: stageReason,
    confidence: {
      type: "confidence",
      text: confidence.summary || "",
      details: confidence.details || [],
    },
    adoptedEvidence: evidenceView.adopted || [],
    excludedEvidence: evidenceView.excluded || [],
  };
}

function buildOverallReason(discussion, evidenceView, contributions, stage) {
  if (!discussion?.ok) {
    return {
      type: "overall",
      text: "Discussion Engine の結果が得られなかったため、説明を生成できません。",
      available: false,
    };
  }
  const top = (contributions.topFactors || [])
    .slice(0, 3)
    .map((f) => `${f.label}${f.percent}%`)
    .join("、");
  const adoptedN = (evidenceView.adopted || []).length;
  const excludedN = (evidenceView.excluded || []).length;
  const conflictN = (discussion.conflicts || []).length;
  const conf = discussion.consensus?.finalConfidence ?? "—";
  const parts = [
    `Discussion で採用 Evidence ${adoptedN}件・除外 ${excludedN}件（矛盾グループ ${conflictN}）を比較した結果です。`,
    `寄与の大きい要素は ${top || "—"}。`,
    `Final Confidence ${conf}%（Stage${stage}）。`,
  ];
  const topEvidence = (evidenceView.important || [])[0];
  if (topEvidence) {
    parts.push(`特に重要な根拠: ${topEvidence.sourceLabel}「${topEvidence.claim}」。`);
  }
  return {
    type: "overall",
    text: parts.join(" "),
    available: true,
  };
}

export const ReasonBuilder = { build: buildReasons };
