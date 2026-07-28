/* ========================================
   TrackAnalyzer — Ver5.3
   ======================================== */

import { clamp } from "../utils.js";

export function analyzeTrack(context = {}) {
  const race = context.race || {};
  const raceA = context.raceAnalysis || {};
  const tracks = context.aiInput?.tracks || [];
  const weathers = context.aiInput?.weathers || [];

  const surface = raceA.track || race.track || tracks[0]?.surface || "芝";
  const condition =
    raceA.condition || race.trackCondition || tracks[0]?.condition || "良";
  const weather = race.weather || weathers[0]?.condition || "晴";

  let bias = "フラット";
  let biasScore = 50;
  if (surface === "ダート" && (condition === "稍重" || condition === "重")) {
    bias = "前有利";
    biasScore = 72;
  } else if (surface === "芝" && condition === "良") {
    bias = "差しも届く";
    biasScore = 58;
  } else if (condition === "不良") {
    bias = "スタミナ重視";
    biasScore = 66;
  }

  return {
    analyzer: "TrackAnalyzer",
    surface,
    condition,
    weather,
    bias,
    biasScore,
    trackScore: clamp(biasScore),
    venueLabel: raceA.venueLabel || race.venueLabel || "",
  };
}
