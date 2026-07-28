/* ========================================
   HorseValidator — Ver7.3
   ======================================== */

export function validateHorses(horses = []) {
  const errors = [];
  const warnings = [];
  const sanitized = [];
  const seen = new Set();

  for (const h of horses || []) {
    const number = Number(h.number);
    if (!number) {
      errors.push({ code: "NUM", message: "馬番欠損" });
      continue;
    }
    if (seen.has(number)) {
      errors.push({ code: "DUP", message: `馬番重複 ${number}` });
      continue;
    }
    seen.add(number);

    const name = h.horseName || h.horse;
    if (!name) {
      errors.push({ code: "NAME", message: `馬名欠損 ${number}` });
      continue;
    }

    const odds = typeof h.odds === "object" ? h.odds.win : h.odds;
    if (odds != null && (Number(odds) <= 0 || Number(odds) > 9999)) {
      warnings.push({ code: "ODDS", message: `オッズ要確認 ${number}` });
    }

    sanitized.push(h);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    sanitized,
  };
}

export const HorseValidator = { validate: validateHorses };
