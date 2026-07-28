/* ========================================
   PerformanceAnalyzer — Ver5.5
   ======================================== */

export function analyzePerformance(records = []) {
  const closed = records.filter((r) => r?.result && r?.diff);
  const totalRaces = closed.length;
  let hits = 0;
  let winHits = 0;
  let stake = 0;
  let payout = 0;
  let popSum = 0;
  let evSum = 0;
  let iqSum = 0;
  let popCount = 0;

  const hitSeries = [];
  const roiSeries = [];
  let runStake = 0;
  let runPayout = 0;
  let runHits = 0;

  for (let i = 0; i < closed.length; i += 1) {
    const rec = closed[i];
    const hit = Boolean(rec.diff.hitPlace || rec.diff.hitWin);
    if (hit) hits += 1;
    if (rec.diff.hitWin) winHits += 1;
    const s = Number(rec.result.stake) || 1000;
    const p = Number(rec.result.payout) || 0;
    stake += s;
    payout += p;
    runStake += s;
    runPayout += p;
    if (hit) runHits += 1;

    const favPop = Number(
      rec.result.winnerPopularity ??
        rec.prediction?.topPopularity ??
        rec.scores?.publicExpectation
    );
    if (Number.isFinite(favPop)) {
      popSum += favPop;
      popCount += 1;
    }
    evSum += Number(rec.scores?.valueScore ?? rec.scores?.valueOpportunity ?? 50);
    iqSum += Number(
      rec.scores?.finalIqScore ?? rec.scores?.iqScore ?? 60
    );

    hitSeries.push({
      index: i + 1,
      raceLabel: raceLabel(rec),
      hitRate: Math.round((runHits / (i + 1)) * 1000) / 10,
    });
    roiSeries.push({
      index: i + 1,
      raceLabel: raceLabel(rec),
      roi: runStake > 0 ? Math.round((runPayout / runStake) * 1000) / 10 : 0,
    });
  }

  return {
    totalRaces,
    hitRate: totalRaces ? Math.round((hits / totalRaces) * 1000) / 10 : 0,
    winHitRate: totalRaces ? Math.round((winHits / totalRaces) * 1000) / 10 : 0,
    recoveryRate: stake > 0 ? Math.round((payout / stake) * 1000) / 10 : 0,
    roi: stake > 0 ? Math.round((payout / stake) * 1000) / 10 : 0,
    avgPopularity: popCount ? Math.round((popSum / popCount) * 10) / 10 : null,
    avgExpectedValue: totalRaces ? Math.round(evSum / totalRaces) : 0,
    avgIqScore: totalRaces ? Math.round(iqSum / totalRaces) : 0,
    totalStake: stake,
    totalPayout: payout,
    hitSeries,
    roiSeries,
  };
}

function raceLabel(rec) {
  const r = rec.race || {};
  return `${r.date || ""} ${r.venueLabel || r.venue || ""} ${r.number || ""}R`.trim();
}
