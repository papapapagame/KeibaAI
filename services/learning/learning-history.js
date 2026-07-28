/* ========================================
   LearningHistory — Ver5.5
   ======================================== */

export function appendHistoryEvent(db, event = {}) {
  const history = Array.isArray(db.history) ? [...db.history] : [];
  history.unshift({
    id: event.id || `he_${Date.now()}`,
    timestamp: event.timestamp || new Date().toISOString(),
    type: event.type || "learn",
    message: event.message || "",
    raceId: event.raceId || null,
    meta: event.meta || null,
  });
  return {
    ...db,
    history: history.slice(0, 100),
  };
}

export function listRecentLearning(records = [], limit = 8) {
  return records
    .filter((r) => r?.result)
    .slice()
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      label: `${r.race?.date || ""} ${r.race?.venueLabel || ""} ${r.race?.number || ""}R`.trim(),
      hit: Boolean(r.diff?.hitPlace || r.diff?.hitWin),
      roi:
        Number(r.result?.stake) > 0
          ? Math.round(
              (Number(r.result.payout || 0) / Number(r.result.stake)) * 1000
            ) / 10
          : 0,
      iq: r.scores?.finalIqScore ?? r.scores?.iqScore ?? null,
    }));
}

export function buildImprovementPoints(analyzerStats = [], performance = {}) {
  const points = [];
  if ((performance.hitRate || 0) < 45) {
    points.push("的中率が低めです。本命候補の絞り込みを見直す余地があります。");
  }
  if ((performance.roi || 0) < 90) {
    points.push("回収率が100%未満です。期待値の高い馬を優先する提案です。");
  }
  const weak = analyzerStats.filter((a) => a.accuracy < 65).slice(0, 2);
  for (const w of weak) {
    points.push(`${w.name} の精度が相対的に低いため、寄与度の見直しを提案します。`);
  }
  const strong = analyzerStats.filter((a) => a.accuracy >= 80).slice(0, 1);
  for (const s of strong) {
    points.push(`${s.name} は安定しているため、将来Ver6.0で寄与を上げる候補です。`);
  }
  if (!points.length) {
    points.push("現時点で大きな劣化は見当たりません。記録を継続してください。");
  }
  return points;
}
