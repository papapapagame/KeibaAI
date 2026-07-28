/* ========================================
   Explainable Market AI — Ver5.4
   ======================================== */

export function buildMarketExplanations(scores = {}) {
  const factors = [
    { label: "Support", delta: Math.round((scores.supportScore || 50) - 50) },
    { label: "Buzz", delta: Math.round((scores.buzzScore || 50) - 50) },
    { label: "Trend", delta: Math.round((scores.trendScore || 50) - 50) },
    { label: "Heat", delta: Math.round((scores.marketHeat || 50) - 50) },
    {
      label: "Expectation",
      delta: Math.round((scores.publicExpectation || 50) - 50),
    },
    { label: "ValueOpp", delta: Math.round((scores.valueOpportunity || 50) - 50) },
    { label: "Risk", delta: Math.round(50 - (scores.riskScore || 50)) },
    {
      label: "Confidence",
      delta: Math.round((scores.marketConfidence || 50) - 50),
    },
  ]
    .filter((f) => f.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    factors,
    summary: factors
      .slice(0, 5)
      .map((f) => `${f.label} ${f.delta > 0 ? `+${f.delta}` : f.delta}`)
      .join(" / "),
  };
}
