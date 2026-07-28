/* ========================================
   HistoryAnalyzer — Ver5.3
   ======================================== */

import { avg, clamp, horseName, toNum } from "../utils.js";

export function analyzeHistory(context = {}) {
  const horses = Array.isArray(context.horses) ? context.horses : [];
  const histories = context.aiInput?.histories || [];

  const byHorse = horses.map((h) => {
    const rows = histories.filter(
      (x) =>
        Number(x.horseNumber) === Number(h.number) ||
        x.horseName === horseName(h)
    );
    const finishes = rows.map((r) => toNum(r.finish, 9));
    const form = finishes.length
      ? clamp(85 - avg(finishes) * 7)
      : clamp(60 - avg((h.last3 || [8]).map(Number)) * 5);

    return {
      number: h.number,
      name: horseName(h),
      starts: rows.length || (h.last3 || []).length,
      avgFinish: finishes.length ? avg(finishes) : avg((h.last3 || [8]).map(Number)),
      form,
      lastVenue: rows[0]?.venue || "",
      classTouch: rows[0]?.className || "",
    };
  });

  return {
    analyzer: "HistoryAnalyzer",
    horses: byHorse,
    depth: histories.length,
    reliability: clamp(40 + Math.min(40, histories.length * 2)),
  };
}
