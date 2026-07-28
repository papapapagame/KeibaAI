/* ========================================
   Market Analyzer — Ver7.8
   Market / Support / Value Score
   人気順への単純依存はしない
   ======================================== */

import { summarizeOddsTrend } from "./odds-history-manager.js";

/**
 * @returns {{ items: array, marketStatus: object }}
 */
export function analyzeMarket(oddsItems = []) {
  const list = (oddsItems || []).map((o) => enrichMarketItem(o));
  const avgValue =
    list.length === 0
      ? 0
      : Math.round(
          list.reduce((s, x) => s + x.valueScore, 0) / list.length
        );

  return {
    items: list,
    marketStatus: {
      count: list.length,
      avgMarketScore: avg(
        list.map((x) => x.marketScore)
      ),
      avgSupportScore: avg(list.map((x) => x.supportScore)),
      avgValueScore: avgValue,
      overbetCount: list.filter((x) => x.marketLabel === "過剰人気").length,
      underbetCount: list.filter((x) => x.marketLabel === "過小評価").length,
      valueCount: list.filter((x) => x.marketLabel === "期待値あり").length,
    },
  };
}

function enrichMarketItem(raw) {
  const winOdds = Number(raw.winOdds) || 99;
  const placeOdds = Number(raw.placeOdds) || Math.max(1.1, Math.sqrt(winOdds));
  const popularity = Number(raw.popularity) || 99;
  const marketIndex =
    raw.marketIndex != null
      ? Number(raw.marketIndex)
      : marketIndexFromOdds(winOdds, popularity);
  const trend = summarizeOddsTrend(raw);
  const implied = 100 / winOdds;

  // Market Score: 市場注目度（指数＋短縮傾向）。人気1位だけを過大評価しない
  let marketScore = clamp(
    marketIndex * 0.7 +
      (trend === "shortening" ? 12 : trend === "drifting" ? -8 : 0) +
      Math.max(0, 18 - popularity) * 0.8,
    0,
    100
  );

  // Support Score: 複勝側の支持（単勝との乖離が小さいほど安定）
  const placeImplied = 100 / placeOdds;
  const supportScore = clamp(
    placeImplied * 1.2 + (100 - Math.abs(implied - placeImplied * 0.45)),
    0,
    100
  );

  // Value Score: オッズ水準と市場指数のギャップ（穴の妙味／過剰人気）
  // 人気順ではなく「市場指数に対するオッズの厚み」で評価
  const fairOdds = fairOddsFromIndex(marketIndex);
  const valueGap = winOdds / Math.max(1.1, fairOdds);
  let valueScore = clamp(50 + (valueGap - 1) * 35, 0, 100);
  if (popularity <= 2 && valueGap < 0.85) {
    valueScore = clamp(valueScore - 15, 0, 100); // 過剰人気抑制
  }
  if (popularity >= 5 && valueGap > 1.15) {
    valueScore = clamp(valueScore + 8, 0, 100); // 過小評価を補助
  }

  const marketLabel = labelFromScores({
    popularity,
    valueGap,
    valueScore,
    trend,
  });

  return {
    ...raw,
    winOdds,
    placeOdds,
    popularity,
    marketIndex,
    oddsTrend: trend,
    impliedWinPct: Math.round(implied * 10) / 10,
    marketScore: Math.round(marketScore),
    supportScore: Math.round(supportScore),
    valueScore: Math.round(valueScore),
    marketLabel,
    expectedValueHint: Math.round(valueGap * 100) / 100,
  };
}

function marketIndexFromOdds(winOdds, popularity) {
  const fromOdds = clamp(100 - Math.log10(winOdds) * 40, 5, 95);
  const fromPop = clamp(100 - (popularity - 1) * 6, 5, 95);
  return Math.round(fromOdds * 0.55 + fromPop * 0.45);
}

function fairOddsFromIndex(index) {
  const i = clamp(Number(index) || 50, 5, 95);
  // 粗い逆変換（指数高いほど短い）
  return Math.max(1.5, Math.pow(10, (100 - i) / 40));
}

function labelFromScores({ popularity, valueGap, valueScore, trend }) {
  if (popularity <= 3 && valueGap < 0.9) return "過剰人気";
  if (valueScore >= 62 && valueGap >= 1.1) return "過小評価";
  if (valueScore >= 55 && trend === "shortening") return "期待値あり";
  if (valueScore >= 58) return "期待値あり";
  return "市場中立";
}

function avg(nums = []) {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export const MarketAnalyzer = {
  analyze: analyzeMarket,
};
