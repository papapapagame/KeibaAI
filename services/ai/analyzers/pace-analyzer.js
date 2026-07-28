/* ========================================
   PaceAnalyzer — Ver5.3
   ======================================== */

import { clamp } from "../utils.js";

export function analyzePace(context = {}) {
  const raceA = context.raceAnalysis || {};
  const horses = Array.isArray(context.horses) ? context.horses : [];
  const styles = horses.map((h) => String(h.runningStyle || ""));

  const escape = styles.filter((s) => s.includes("逃")).length;
  const front = styles.filter((s) => s.includes("先行")).length;
  const stalk = styles.filter((s) => s.includes("差")).length;
  const closer = styles.filter((s) => s.includes("追")).length;

  const paceScore = clamp(
    raceA.paceScore != null
      ? raceA.paceScore
      : 50 + escape * 8 + front * 3 - stalk * 2 - closer
  );

  let scenario = "先行勢がペースを作り、差しが届く平均展開";
  if (raceA.pacePrediction === "ハイペース") {
    scenario = "逃げ争いが激化し、差し・追込に展開が向くハイペース";
  } else if (raceA.pacePrediction === "スローペース") {
    scenario = "逃げ馬が楽にコントロールし、先行有利のスローペース";
  }

  return {
    analyzer: "PaceAnalyzer",
    paceScore,
    pacePrediction: raceA.pacePrediction || "平均",
    distribution: { escape, front, stalk, closer },
    scenario,
    frontBias: raceA.frontFavored ? 1 : 0,
    closerBias: raceA.closerFavored ? 1 : 0,
  };
}
