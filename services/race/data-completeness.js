/* ========================================
   Data Completeness — Ver7.3
   ======================================== */

export function computeDataCompleteness(race, status) {
  const horses = race?.horses || [];
  const n = Math.max(horses.length, 1);

  const raceScore = avg([
    race?.date ? 100 : 0,
    race?.venue?.venueId || race?.venueLabel ? 100 : 0,
    race?.number ? 100 : 0,
    (race?.distance?.meters || race?.distance) ? 100 : 0,
    (race?.surface?.value || race?.track) ? 100 : 0,
    race?.startTime || race?.time ? 90 : 40,
    race?.trackCondition && !String(race.trackCondition).includes("未確定") ? 90 : 40,
    race?.weather && race.weather !== "未確定" ? 80 : 35,
  ]);

  const horseScore = avg(
    horses.map((h) => {
      const name = h.horseName || h.horse;
      const jockey = typeof h.jockey === "object" ? h.jockey.name : h.jockey;
      const trainer = typeof h.trainer === "object" ? h.trainer.name : h.trainer;
      const weight = typeof h.weight === "object" ? h.weight.kg : h.weight;
      const frame = typeof h.frame === "object" ? h.frame.frame : h.frame;
      return avg([
        name ? 100 : 0,
        h.number ? 100 : 0,
        h.age != null ? 90 : 50,
        h.sex ? 90 : 50,
        jockey && jockey !== "未定" ? 100 : 20,
        trainer ? 90 : 40,
        Number(weight) > 0 ? 90 : 30,
        Number(frame) > 0 ? 90 : 30,
        h.runningStyle ? 80 : 40,
        (h.last3 || h.history || []).length ? 85 : 40,
      ]);
    })
  );

  const oddsScore = avg(
    horses.map((h) => {
      const o = typeof h.odds === "object" ? h.odds.win : h.odds;
      const p = typeof h.popularity === "object" ? h.popularity.value : h.popularity;
      if (h._oddsUnconfirmed) return 25;
      return avg([
        Number(o) > 0 && Number(o) < 99 ? 100 : 20,
        Number(p) > 0 && Number(p) < 30 ? 100 : 20,
      ]);
    })
  );

  const marketScore = status?.odds?.ok ? 70 : status?.track?.ok ? 40 : 25;

  const overall = Math.round(
    raceScore * 0.3 + horseScore * 0.35 + oddsScore * 0.2 + marketScore * 0.15
  );

  return {
    race: Math.round(raceScore),
    horse: Math.round(horseScore || 0),
    odds: Math.round(oddsScore || 0),
    market: Math.round(marketScore),
    overall: Math.max(0, Math.min(100, overall)),
    horseCount: horses.length,
    note: "※現時点で取得済み情報に基づく充足率です。",
  };
}

/** Confidence 補正（既存AIは変更せず表示層で利用） */
export function confidenceFromCompleteness(baseConfidence, completeness) {
  const base = Number(baseConfidence);
  const overall = Number(completeness?.overall);
  if (!Number.isFinite(base) && !Number.isFinite(overall)) return null;
  if (!Number.isFinite(base)) return overall;
  if (!Number.isFinite(overall)) return base;
  return Math.round(base * 0.55 + overall * 0.45);
}

function avg(list) {
  const arr = (list || []).filter((v) => Number.isFinite(Number(v)));
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + Number(v), 0) / arr.length;
}
