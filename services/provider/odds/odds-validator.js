/* ========================================
   OddsValidator — Ver10.2（Provider 層）
   異常値・人気重複・欠損・更新時刻・必須
   ======================================== */

export const ODDS_PROVIDER_VALIDATOR_VERSION = "10.2.0";

export function validateRealOdds(parsed = {}) {
  const errors = [];
  const warnings = [];
  const items = parsed.items || [];
  const seenNumbers = new Set();
  const seenPop = new Set();
  const accepted = [];

  if (!items.length) {
    errors.push({ code: "EMPTY", message: "オッズデータが空です" });
  }

  const metaUpdated = parsed.meta?.updatedAt;
  if (!metaUpdated) {
    warnings.push({
      code: "UPDATED_AT",
      message: "全体の更新時刻がありません",
    });
  }

  for (const raw of items) {
    const rowErrors = [];
    const number = Number(raw.number);
    const winOdds = Number(raw.winOdds);
    const placeOdds =
      raw.placeOdds != null ? Number(raw.placeOdds) : null;
    const popularity = Number(raw.popularity);

    if (!Number.isFinite(number) || number <= 0) {
      rowErrors.push({
        code: "REQUIRED",
        message: `馬番必須/異常: ${raw.number}`,
      });
    }
    if (seenNumbers.has(number)) {
      rowErrors.push({ code: "DUP_NUMBER", message: `馬番重複: ${number}` });
    }
    if (Number.isFinite(number)) seenNumbers.add(number);

    if (!Number.isFinite(winOdds) || winOdds < 1.0 || winOdds > 999.9) {
      rowErrors.push({
        code: "ODDS",
        message: `単勝オッズ異常: ${number}番`,
      });
    }

    if (placeOdds != null) {
      if (!Number.isFinite(placeOdds) || placeOdds < 1.0) {
        rowErrors.push({
          code: "PLACE",
          message: `複勝オッズ異常: ${number}番`,
        });
      } else if (placeOdds > winOdds + 0.01) {
        warnings.push({
          code: "PLACE_GT_WIN",
          message: `複勝>=単勝: ${number}番`,
        });
      }
    } else {
      warnings.push({
        code: "PLACE_MISSING",
        message: `複勝欠損: ${number}番`,
      });
    }

    if (!Number.isFinite(popularity) || popularity < 1 || popularity > 18) {
      rowErrors.push({
        code: "POP",
        message: `人気順位異常: ${number}番`,
      });
    } else if (seenPop.has(popularity)) {
      rowErrors.push({
        code: "DUP_POP",
        message: `人気順位重複: ${popularity}番人気`,
      });
    } else {
      seenPop.add(popularity);
    }

    if (!raw.updatedAt && !metaUpdated) {
      warnings.push({
        code: "ROW_UPDATED_AT",
        message: `更新時刻欠損: ${number}番`,
      });
    }

    if (rowErrors.length) {
      errors.push(...rowErrors);
      continue;
    }

    const place =
      Number.isFinite(placeOdds) && placeOdds >= 1.0
        ? placeOdds
        : estimatePlace(winOdds);

    accepted.push({
      ...raw,
      number,
      horse: raw.horse || raw.horseName || "",
      horseName: raw.horseName || raw.horse || "",
      winOdds,
      placeOdds: place,
      popularity,
      marketIndex:
        raw.marketIndex != null && Number.isFinite(Number(raw.marketIndex))
          ? Number(raw.marketIndex)
          : null,
      updatedAt: raw.updatedAt || metaUpdated || null,
      history: Array.isArray(raw.history) ? raw.history : [],
      oddsConfirmed: true,
      providerName:
        raw.providerName || parsed.meta?.providerName || parsed.providerId,
    });
  }

  return {
    ok: errors.length === 0 && accepted.length > 0,
    errors,
    warnings,
    acceptedItems: accepted,
    rejectedCount: items.length - accepted.length,
    version: ODDS_PROVIDER_VALIDATOR_VERSION,
  };
}

function estimatePlace(winOdds) {
  const w = Number(winOdds) || 10;
  return Math.max(1.1, Math.round(Math.sqrt(w) * 10) / 10);
}

export const OddsValidator = {
  validate: validateRealOdds,
  version: ODDS_PROVIDER_VALIDATOR_VERSION,
};
