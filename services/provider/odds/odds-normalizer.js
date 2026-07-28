/* ========================================
   OddsNormalizer — Ver10.2
   → Unified Odds / Horse / Race / Prediction hints
   ======================================== */

import {
  createOdds,
  createPopularity,
  createHorse,
  createAnalysisStageRef,
  UNIFIED_VERSION,
} from "../../models/unified.js";
import { analyzeMarket } from "../../odds/market-analyzer.js";

export const ODDS_NORMALIZER_VERSION = "10.2.0";

export function normalizeRealOdds(parsed = {}, validation = {}, stage = 7) {
  const source = validation.acceptedItems || parsed.items || [];
  const market = analyzeMarket(source);
  const s = Number(stage) || 7;

  const oddsEntries = market.items.map((o) => ({
    modelVersion: UNIFIED_VERSION,
    kind: "Odds",
    number: o.number,
    horse: o.horse,
    odds: createOdds({
      win: o.winOdds,
      place: o.placeOdds,
      confirmed: true,
      updatedAt: o.updatedAt,
    }),
    popularity: createPopularity({
      value: o.popularity,
      confirmed: true,
    }),
    marketIndex: o.marketIndex,
    marketScore: o.marketScore,
    supportScore: o.supportScore,
    valueScore: o.valueScore,
    marketLabel: o.marketLabel,
    oddsTrend: o.oddsTrend,
    history: o.history || [],
    updatedAt: o.updatedAt,
    fetchedAt: o.fetchedAt || parsed.meta?.fetchedAt || null,
    providerName: o.providerName || parsed.meta?.providerName || parsed.providerId,
    analysisStage: createAnalysisStageRef(s),
    // flat for Odds Engine
    winOdds: o.winOdds,
    placeOdds: o.placeOdds,
    impliedWinPct: o.impliedWinPct,
    expectedValueHint: o.expectedValueHint,
    oddsConfirmed: true,
  }));

  const horses = oddsEntries.map((o) =>
    createHorse({
      number: o.number,
      horseName: o.horse,
      odds: o.winOdds,
      placeOdds: o.placeOdds,
      popularity: o.popularity?.value ?? o.popularity,
    })
  );

  return {
    modelVersion: UNIFIED_VERSION,
    normalizerVersion: ODDS_NORMALIZER_VERSION,
    providerId: parsed.providerId || "real-odds",
    stage: s,
    odds: market.items,
    oddsEntries,
    horses,
    marketStatus: market.marketStatus,
    meta: parsed.meta || {},
    normalizedAt: new Date().toISOString(),
  };
}

export const OddsNormalizer = {
  normalize: normalizeRealOdds,
  version: ODDS_NORMALIZER_VERSION,
};
