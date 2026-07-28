/* ========================================
   ResultAnalyzer — Ver5.5
   着順・人気・オッズ・タイム・上がり・払戻・馬場・天候・展開
   AI予想との差分を算出
   ======================================== */

export function analyzeRaceResult(prediction = {}, result = {}, context = {}) {
  const predTop = normalizeNumbers(
    prediction.topNumbers ||
      prediction.rankedNumbers ||
      (prediction.horses || []).map((h) => h.number)
  );
  const actualOrder = normalizeNumbers(
    result.finishOrder ||
      (result.horses || [])
        .slice()
        .sort((a, b) => Number(a.finish) - Number(b.finish))
        .map((h) => h.number)
  );

  const winner = actualOrder[0] || null;
  const predWinner = predTop[0] || null;
  const hitWin = winner != null && predWinner === winner;
  const hitTop3 =
    actualOrder.slice(0, 3).filter((n) => predTop.slice(0, 3).includes(n))
      .length >= 2;
  const hitPlace =
    winner != null && predTop.slice(0, 3).includes(winner);

  const rankErrors = predTop.slice(0, 5).map((num, idx) => {
    const actualIdx = actualOrder.indexOf(num);
    const actualRank = actualIdx >= 0 ? actualIdx + 1 : 18;
    return {
      number: num,
      predictedRank: idx + 1,
      actualRank,
      error: Math.abs(actualRank - (idx + 1)),
    };
  });

  const avgRankError =
    rankErrors.length > 0
      ? rankErrors.reduce((s, r) => s + r.error, 0) / rankErrors.length
      : null;

  const payout = Number(result.payout) || 0;
  const stake = Number(result.stake) || Number(context.stake) || 1000;
  const roi = stake > 0 ? (payout / stake) * 100 : 0;

  return {
    analyzer: "ResultAnalyzer",
    resultSummary: {
      finishOrder: actualOrder,
      popularity: result.popularity || null,
      odds: result.odds || null,
      time: result.time || "",
      last3f: result.last3f || result.agari || "",
      payout,
      stake,
      trackCondition: result.trackCondition || result.condition || "",
      weather: result.weather || "",
      pace: result.pace || result.tenkai || "",
    },
    diff: {
      hitWin,
      hitPlace,
      hitTop3,
      predWinner,
      actualWinner: winner,
      avgRankError,
      rankErrors,
      topOverlap: overlapCount(predTop.slice(0, 5), actualOrder.slice(0, 5)),
    },
    roi,
  };
}

function normalizeNumbers(list) {
  return (Array.isArray(list) ? list : [])
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function overlapCount(a, b) {
  const set = new Set(b);
  return a.filter((x) => set.has(x)).length;
}
