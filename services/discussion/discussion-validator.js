/* ========================================
   Discussion Validator — Ver8.2
   ======================================== */

import { EVIDENCE_SOURCE_SET } from "./evidence-sources.js";

export function validateDiscussionPayload(payload = {}) {
  const errors = [];
  const warnings = [];
  const evidence = Array.isArray(payload.evidence) ? payload.evidence : [];

  if (!evidence.length) {
    errors.push({ code: "EMPTY", message: "Evidence が空です" });
  }

  const seen = new Set();
  for (const e of evidence) {
    if (!e?.id) {
      errors.push({ code: "ID", message: "Evidence id 欠損" });
      continue;
    }
    if (seen.has(e.id)) {
      errors.push({ code: "DUP", message: `Evidence 重複: ${e.id}` });
      continue;
    }
    seen.add(e.id);
    if (!EVIDENCE_SOURCE_SET.has(e.source)) {
      errors.push({
        code: "SOURCE",
        message: `未知のソース: ${e.source}`,
      });
    }
    const s = e.scores || {};
    for (const key of [
      "confidence",
      "freshness",
      "reliability",
      "coverage",
      "importance",
    ]) {
      const v = Number(s[key]);
      if (!Number.isFinite(v) || v < 0 || v > 100) {
        errors.push({
          code: "SCORE",
          message: `スコア異常 ${e.id}.${key}`,
        });
      }
    }
  }

  const consensus = payload.consensus || {};
  for (const key of [
    "consensusScore",
    "agreementScore",
    "conflictScore",
    "finalConfidence",
  ]) {
    if (consensus[key] == null) {
      warnings.push({ code: "CONSENSUS", message: `${key} 未設定` });
    } else {
      const v = Number(consensus[key]);
      if (!Number.isFinite(v) || v < 0 || v > 100) {
        errors.push({ code: "CONSENSUS", message: `${key} 範囲外` });
      }
    }
  }

  if (!payload.reasoning?.judgment) {
    warnings.push({ code: "REASONING", message: "judgment 未設定" });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export const DiscussionValidator = { validate: validateDiscussionPayload };
