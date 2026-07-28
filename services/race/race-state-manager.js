/* ========================================
   RaceStateManager — Ver7.3
   取得状態（〇△×）
   ======================================== */

export function buildRaceDataStatus(race, options = {}) {
  const stage = Number(options.stage ?? race?.analysisStage?.stage ?? 0);
  const horses = race?.horses || [];

  const hasMeeting = Boolean(race?.date && (race?.venue?.venueId || race?.venueLabel));
  const hasCard = horses.length > 0;
  const jockeyOk = horses.length > 0 && horses.every((h) => {
    const name = typeof h.jockey === "object" ? h.jockey.name : h.jockey;
    return name && name !== "未定";
  });
  const weightOk = horses.length > 0 && horses.every((h) => {
    const w = typeof h.weight === "object" ? h.weight.kg : h.weight;
    return Number.isFinite(Number(w)) && !h._weightUnconfirmed;
  });
  const frameOk = horses.length > 0 && horses.every((h) => {
    const f = typeof h.frame === "object" ? h.frame.frame : h.frame;
    return Number(f) > 0 && !h._frameUnconfirmed;
  });
  const trackOk = Boolean(race?.trackCondition) && race.trackCondition !== "未確定" && !String(race.trackCondition).includes("未確定");
  const oddsOk = horses.length > 0 && horses.every((h) => {
    const o = typeof h.odds === "object" ? h.odds.win : h.odds;
    return Number.isFinite(Number(o)) && Number(o) > 0 && Number(o) < 99 && !h._oddsUnconfirmed;
  });

  // Stage に応じた到達見込みも反映
  return {
    meeting: mark(hasMeeting, true),
    card: mark(hasCard, stage >= 1),
    jockey: mark(jockeyOk, stage >= 4),
    weight: mark(weightOk, stage >= 5),
    frame: mark(frameOk, stage >= 3),
    track: mark(trackOk, stage >= 6),
    odds: mark(oddsOk, stage >= 7),
    stage,
  };
}

function mark(ok, expected) {
  if (ok) return { mark: "〇", label: "取得済", ok: true };
  if (expected) return { mark: "△", label: "一部/暫定", ok: false, partial: true };
  return { mark: "×", label: "未取得", ok: false };
}

export const RaceStateManager = { buildStatus: buildRaceDataStatus };
