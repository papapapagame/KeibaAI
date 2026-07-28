/* ========================================
   Explanation Validator — Ver8.3
   ======================================== */

export function validateExplanation(payload = {}) {
  const errors = [];
  const warnings = [];

  const contributions = payload.contributions?.items || [];
  if (!contributions.length) {
    errors.push({ code: "CONTRIB_EMPTY", message: "寄与率一覧が空です" });
  } else {
    const sum = contributions.reduce((s, c) => s + Number(c.percent || 0), 0);
    if (sum !== 100) {
      errors.push({
        code: "CONTRIB_SUM",
        message: `寄与率合計が100%ではありません（${sum}%）`,
      });
    }
  }

  const reasons = payload.reasons || {};
  if (!reasons.overall?.text) {
    errors.push({ code: "REASON", message: "総合評価理由が欠損しています" });
  }
  if (!Array.isArray(reasons.plus)) {
    warnings.push({ code: "REASON_PLUS", message: "加点理由配列なし" });
  }
  if (!Array.isArray(reasons.minus)) {
    warnings.push({ code: "REASON_MINUS", message: "減点理由配列なし" });
  }

  const evidence = payload.evidenceView || {};
  const adopted = evidence.adopted || [];
  const discussionAdopted = payload.discussion?.reasoning?.adopted || [];
  if (payload.discussion?.ok) {
    const ids = new Set(adopted.map((e) => e.id));
    for (const e of discussionAdopted) {
      if (!ids.has(e.id)) {
        errors.push({
          code: "EVIDENCE",
          message: `採用 Evidence 不整合: ${e.id}`,
        });
      }
    }
  }

  const conf = payload.confidenceExplainer || {};
  if (conf.finalConfidence == null) {
    warnings.push({ code: "CONF", message: "Final Confidence 未設定" });
  } else {
    const v = Number(conf.finalConfidence);
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      errors.push({ code: "CONF", message: "Confidence 範囲外" });
    }
  }

  if (payload.discussion && payload.discussion.ok === false) {
    errors.push({
      code: "DISCUSSION",
      message: "Discussion 結果が無効なため説明を表示できません",
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export const ExplanationValidator = { validate: validateExplanation };
