/* ========================================
   RaceAnalyzer — Ver5.3
   レースレベル / ペース予測 / 逃げ馬数 / 差し・先行有利 / 展開難易度
   ======================================== */

import { clamp, toNum } from "../utils.js";

export function analyzeRace(context = {}) {
  const race = context.race || {};
  const horses = Array.isArray(context.horses) ? context.horses : [];
  const intelRaces = context.aiInput?.races || [];
  const selected =
    intelRaces.find((r) => Number(r.number) === Number(race.number)) ||
    intelRaces[0] ||
    race;

  const grade = String(selected.grade || race.grade || "B").toUpperCase();
  const gradeMap = { S: 92, A: 80, B: 68, C: 55, D: 45 };
  const raceLevel = gradeMap[grade] || 65;

  const styles = horses.map((h) => String(h.runningStyle || ""));
  const escapeCount = styles.filter((s) => s.includes("逃")).length;
  const frontCount = styles.filter((s) => s.includes("先行") || s.includes("逃")).length;
  const closerCount = styles.filter(
    (s) => s.includes("差") || s.includes("追")
  ).length;

  let paceLabel = "平均";
  let paceScore = 55;
  if (escapeCount >= 3 || frontCount >= Math.ceil(horses.length * 0.55)) {
    paceLabel = "ハイペース";
    paceScore = 78;
  } else if (escapeCount <= 1 && frontCount <= 3) {
    paceLabel = "スローペース";
    paceScore = 42;
  }

  const frontAdvantage = clamp(48 + frontCount * 4 - closerCount * 2);
  const closerAdvantage = clamp(48 + closerCount * 4 - frontCount * 2);
  const complexity = clamp(
    40 +
      Math.abs(frontCount - closerCount) * 3 +
      escapeCount * 6 +
      (horses.length > 14 ? 8 : 0)
  );

  const distance = toNum(selected.distance || race.distance, 1600);
  const track = selected.track || race.track || "芝";

  return {
    analyzer: "RaceAnalyzer",
    raceLevel,
    pacePrediction: paceLabel,
    paceScore,
    escapeCount,
    frontAdvantage,
    closerAdvantage,
    frontFavored: frontAdvantage >= closerAdvantage,
    closerFavored: closerAdvantage > frontAdvantage,
    complexity,
    distance,
    track,
    condition: selected.condition || race.trackCondition || race.condition || "良",
    venueLabel: selected.venueLabel || race.venueLabel || "",
    fieldSize: horses.length,
    summary: `${grade}級相当・${paceLabel}想定・展開難易度${complexity}`,
  };
}
