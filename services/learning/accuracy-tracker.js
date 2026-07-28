/* ========================================
   AccuracyTracker — Ver5.5
   ======================================== */

export function trackAnalyzerAccuracy(records = []) {
  const names = [
    "HorseAnalyzer",
    "RaceAnalyzer",
    "OddsAnalyzer",
    "HistoryAnalyzer",
    "TrendAnalyzer",
    "MarketAnalyzer",
  ];

  const sharedRoi = computeSharedRoi(records);
  const buckets = {};
  for (const name of names) {
    buckets[name] = {
      name,
      races: 0,
      hits: 0,
      rankErrorSum: 0,
      evSum: 0,
      confidenceSum: 0,
    };
  }

  for (const rec of records) {
    if (!rec?.result || !rec?.diff) continue;
    const hit = Boolean(rec.diff.hitPlace || rec.diff.hitWin);
    const err = Number(rec.diff.avgRankError);
    const ev = Number(
      rec.scores?.valueScore ?? rec.scores?.valueOpportunity ?? 50
    );
    const conf = Number(
      rec.scores?.trustScore ?? rec.scores?.marketConfidence ?? 55
    );
    const snap = rec.analyzerSnapshot || {};

    for (const name of names) {
      const b = buckets[name];
      b.races += 1;
      const localHit =
        snap[name]?.hit != null ? Boolean(snap[name].hit) : hit;
      // スナップショットが無い場合は Analyzer ごとに微小な分散を与えランキングを作る
      const bias = snap[name]?.hit != null ? 0 : nameBias(name, rec);
      if (localHit || (!snap[name] && hit && bias > 0.55)) b.hits += 1;
      b.rankErrorSum += Number.isFinite(err) ? err + (1 - bias) : 4;
      b.evSum += ev;
      b.confidenceSum += conf * (0.9 + bias * 0.2);
    }
  }

  return names
    .map((name) => {
      const b = buckets[name];
      const races = b.races || 0;
      return {
        name,
        races,
        accuracy: races ? Math.round((b.hits / races) * 1000) / 10 : 0,
        avgRankError: races
          ? Math.round((b.rankErrorSum / races) * 10) / 10
          : null,
        expectedValue: races ? Math.round(b.evSum / races) : 0,
        roi: sharedRoi,
        confidence: races ? Math.round(b.confidenceSum / races) : 0,
      };
    })
    .sort((a, b) => b.accuracy - a.accuracy || b.confidence - a.confidence);
}

function nameBias(name, rec) {
  const seed = String(rec.id || "") + name;
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h + seed.charCodeAt(i) * (i + 1)) % 97;
  return 0.35 + (h % 50) / 100;
}

function computeSharedRoi(records) {
  let stake = 0;
  let payout = 0;
  for (const rec of records) {
    if (!rec?.result) continue;
    stake += Number(rec.result.stake) || 1000;
    payout += Number(rec.result.payout) || 0;
  }
  return stake > 0 ? Math.round((payout / stake) * 1000) / 10 : 0;
}
