/* ========================================
   Odds Validator — Ver7.8
   ======================================== */

/**
 * オッズ異常・人気重複・欠損・型
 * 失敗データは AI へ渡さない
 */
export function validateOdds(items = []) {
  const errors = [];
  const warnings = [];
  const sanitized = [];
  const seenNumbers = new Set();
  const seenPop = new Set();

  for (const raw of items || []) {
    const number = Number(raw.number);
    const winOdds = Number(raw.winOdds ?? raw.odds);
    const placeOdds =
      raw.placeOdds != null ? Number(raw.placeOdds) : null;
    const popularity = Number(raw.popularity);

    if (!Number.isFinite(number) || number <= 0) {
      errors.push({ code: "TYPE", message: `馬番型異常: ${raw.number}` });
      continue;
    }
    if (seenNumbers.has(number)) {
      errors.push({ code: "DUP", message: `馬番重複: ${number}` });
      continue;
    }
    seenNumbers.add(number);

    if (!Number.isFinite(winOdds) || winOdds < 1.0 || winOdds > 999.9) {
      errors.push({
        code: "ODDS",
        message: `単勝オッズ異常: ${number}番 (${raw.winOdds ?? raw.odds})`,
      });
      continue;
    }
    if (placeOdds != null && (!Number.isFinite(placeOdds) || placeOdds < 1.0 || placeOdds > winOdds + 0.01)) {
      // 複勝が単勝より高いのは警告（一部市況で起きうるため除外はしない）
      if (!Number.isFinite(placeOdds) || placeOdds < 1.0) {
        errors.push({
          code: "ODDS",
          message: `複勝オッズ異常: ${number}番`,
        });
        continue;
      }
      warnings.push({
        code: "PLACE",
        message: `複勝>=単勝: ${number}番`,
      });
    }
    if (!Number.isFinite(popularity) || popularity < 1 || popularity > 18) {
      errors.push({
        code: "POP",
        message: `人気順位異常: ${number}番`,
      });
      continue;
    }
    if (seenPop.has(popularity)) {
      errors.push({
        code: "DUP",
        message: `人気順位重複: ${popularity}番人気`,
      });
      continue;
    }
    seenPop.add(popularity);

    const marketIndex =
      raw.marketIndex != null ? Number(raw.marketIndex) : null;
    if (marketIndex != null && (!Number.isFinite(marketIndex) || marketIndex < 0 || marketIndex > 100)) {
      warnings.push({
        code: "INDEX",
        message: `市場指数範囲外: ${number}番`,
      });
    }

    sanitized.push({
      number,
      horse: raw.horse || raw.horseName || "",
      winOdds,
      placeOdds: Number.isFinite(placeOdds) ? placeOdds : estimatePlace(winOdds),
      popularity,
      marketIndex: Number.isFinite(marketIndex) ? marketIndex : null,
      updatedAt: raw.updatedAt || null,
      history: Array.isArray(raw.history) ? raw.history : [],
      oddsConfirmed: true,
    });
  }

  return {
    ok: errors.length === 0 && sanitized.length > 0,
    errors,
    warnings,
    sanitized,
  };
}

function estimatePlace(winOdds) {
  const w = Number(winOdds) || 10;
  return Math.max(1.1, Math.round(Math.sqrt(w) * 10) / 10);
}

export const OddsValidator = { validate: validateOdds };
