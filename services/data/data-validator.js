/* ========================================
   DataValidator — Ver7.0
   異常データは AI へ渡さない
   ======================================== */

import { toNum } from "./utils.js";

/**
 * @returns {{ ok: boolean, errors: array, warnings: array, sanitized: object|null }}
 */
export function validateNormalized(normalized) {
  const errors = [];
  const warnings = [];
  const race = normalized?.unified?.race;
  const horses = normalized?.unified?.horses || [];

  if (!race) {
    errors.push({ code: "MISSING_RACE", message: "レースデータがありません" });
    return { ok: false, errors, warnings, sanitized: null };
  }

  // 必須項目
  if (!race.number && !race.raceId) {
    errors.push({ code: "REQUIRED_RACE_ID", message: "raceId/number が必須です" });
  }
  if (!race.distance || race.distance < 800 || race.distance > 4000) {
    errors.push({
      code: "DISTANCE_INVALID",
      message: `距離異常: ${race.distance}`,
    });
  }
  if (!race.surface) {
    errors.push({ code: "SURFACE_REQUIRED", message: "馬場（芝/ダート）が必須です" });
  }

  // 馬番重複
  const numbers = horses.map((h) => toNum(h.number));
  const seen = new Set();
  for (const n of numbers) {
    if (!n) {
      errors.push({ code: "HORSE_NUMBER_MISSING", message: "馬番欠損" });
      continue;
    }
    if (seen.has(n)) {
      errors.push({ code: "HORSE_NUMBER_DUP", message: `馬番重複: ${n}` });
    }
    seen.add(n);
  }

  // 型・オッズ・着順
  for (const h of horses) {
    const odds = typeof h.odds === "object" ? h.odds.win : h.odds;
    const o = toNum(odds, NaN);
    if (!Number.isFinite(o) || o <= 0 || o > 9999) {
      errors.push({
        code: "ODDS_INVALID",
        message: `オッズ異常: 馬${h.number} → ${odds}`,
      });
    }
    const pop = toNum(h.popularity, NaN);
    if (!Number.isFinite(pop) || pop < 1 || pop > 30) {
      warnings.push({
        code: "POP_WARN",
        message: `人気値要確認: 馬${h.number}`,
      });
    }
    if (h.result?.finish != null) {
      const f = toNum(h.result.finish, NaN);
      if (!Number.isFinite(f) || f < 1 || f > 30) {
        errors.push({
          code: "FINISH_INVALID",
          message: `着順異常: 馬${h.number}`,
        });
      }
    }
    if (!h.horseName && !h.horse) {
      errors.push({
        code: "HORSE_NAME_MISSING",
        message: `馬名欠損: 馬${h.number}`,
      });
    }
  }

  if (!horses.length) {
    errors.push({ code: "NO_HORSES", message: "出走馬が0頭です" });
  }

  const ok = errors.length === 0;
  return {
    ok,
    errors,
    warnings,
    sanitized: ok
      ? {
          ...normalized,
          validation: {
            ok: true,
            errorCount: 0,
            warningCount: warnings.length,
            checkedAt: new Date().toISOString(),
          },
        }
      : null,
  };
}

export const DataValidator = { validate: validateNormalized };
