/* ========================================
   HorseAnalyzer — Ver5.3
   能力指数 / 安定感 / 上昇度 / 近走 / 距離・コース・脚質適性 / 成長度
   ======================================== */

import { avg, clamp, horseName, toNum } from "../utils.js";

export function analyzeHorses(context = {}) {
  const horses = Array.isArray(context.horses) ? context.horses : [];
  const histories = context.aiInput?.histories || [];
  const race = context.race || {};
  const raceDist = toNum(race.distance, 1600);
  const raceTrack = String(race.track || "芝");

  const results = horses.map((h) => {
    const hist = histories.filter(
      (x) =>
        Number(x.horseNumber) === Number(h.number) ||
        x.horseName === horseName(h)
    );
    const finishes = hist
      .map((x) => toNum(x.finish, NaN))
      .filter((n) => Number.isFinite(n));
    const last3 = Array.isArray(h.last3) ? h.last3.map(Number) : finishes.slice(0, 3);
    const winRate = toNum(h.winRate, 0);
    const placeRate = toNum(h.placeRate, 0);
    const ability = clamp(
      35 + winRate * 1.1 + placeRate * 0.45 + (5 - avg(last3 || [8])) * 4
    );
    const stability = clamp(
      70 - stddev(last3.length ? last3 : [8, 8, 8]) * 8 + placeRate * 0.2
    );
    const recent = clamp(78 - avg(last3.length ? last3 : [8]) * 6);
    const rising =
      last3.length >= 2
        ? clamp(50 + (last3[last3.length - 1] - last3[0]) * -8)
        : 50;

    const distType = String(h.distanceType || "");
    let distanceApt = 58;
    if (raceDist <= 1400 && distType.includes("短")) distanceApt = 82;
    else if (raceDist >= 2000 && (distType.includes("中") || distType.includes("長")))
      distanceApt = 80;
    else if (raceDist >= 1500 && raceDist <= 1800 && distType.includes("マイル"))
      distanceApt = 84;
    else if (distType) distanceApt = 62;

    const courseApt = String(h.trackType || "") === raceTrack ? 80 : 58;
    const style = String(h.runningStyle || "");
    const styleApt = style ? 70 : 55;

    const growth = clamp(
      48 +
        (Number(String(h.sexAge || "").replace(/\D/g, "")) <= 4 ? 12 : 0) +
        (rising - 50) * 0.4
    );

    return {
      number: h.number,
      name: horseName(h),
      ability,
      stability,
      rising,
      recent,
      distanceApt,
      courseApt,
      styleApt,
      growth,
      runningStyle: style,
      score: clamp(
        ability * 0.28 +
          stability * 0.12 +
          recent * 0.18 +
          distanceApt * 0.14 +
          courseApt * 0.12 +
          styleApt * 0.08 +
          growth * 0.08
      ),
    };
  });

  return {
    analyzer: "HorseAnalyzer",
    horses: results,
    top: [...results].sort((a, b) => b.score - a.score).slice(0, 5),
  };
}

function stddev(list) {
  if (!list.length) return 0;
  const m = avg(list);
  const v = avg(list.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}
