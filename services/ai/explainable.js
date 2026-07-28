/* ========================================
   Explainable AI — Ver5.3
   ======================================== */

import { clamp } from "./utils.js";

/**
 * IQ Score の根拠を分解
 */
export function buildExplanations(parts = {}, scores = {}) {
  const horse = parts.horseAnalysis?.top?.[0] || {};
  const odds = parts.oddsAnalysis?.rankedEv?.[0] || {};
  const raceA = parts.raceAnalysis || {};
  const trackA = parts.trackAnalysis || {};
  const trendA = parts.trendAnalysis?.horses?.find(
    (h) => Number(h.number) === Number(horse.number)
  ) || {};
  const paceA = parts.paceAnalysis || {};

  const factors = [
    {
      label: "距離適性",
      delta: signed((horse.distanceApt || 60) - 60, 0.35),
    },
    {
      label: "コース適性",
      delta: signed((horse.courseApt || 60) - 60, 0.3),
    },
    {
      label: "近走評価",
      delta: signed((horse.recent || 55) - 55, 0.28),
    },
    {
      label: "騎手補正",
      delta: signed((trendA.jockeyTrend || 55) - 55, 0.25),
    },
    {
      label: "馬場適性",
      delta: signed((trackA.trackScore || 55) - 55, 0.22),
    },
    {
      label: "期待値",
      delta: signed((odds.expectedValue || 50) - 50, 0.4),
    },
    {
      label: "展開適合",
      delta: signed((paceA.paceScore || 55) - 55, 0.2),
    },
    {
      label: "安定感",
      delta: signed((horse.stability || 55) - 55, 0.2),
    },
  ]
    .map((f) => ({
      ...f,
      delta: Math.round(f.delta),
    }))
    .filter((f) => f.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 8);

  const base = clamp((scores.iqScore || 70) - factors.reduce((s, f) => s + f.delta, 0));

  return {
    iqScore: scores.iqScore,
    focusHorse: horse.name || "—",
    focusNumber: horse.number || null,
    base,
    factors,
    raceNote: raceA.summary || "",
  };
}

function signed(raw, weight) {
  return raw * weight;
}
