/* ========================================
   HorseHistoryManager — Ver7.3
   ======================================== */

export function enrichHorseHistory(horses = []) {
  return (horses || []).map((h) => {
    const history =
      Array.isArray(h.history) && h.history.length
        ? h.history
        : (h.last3 || []).map((finish, i) => ({
            finish: Number(finish),
            order: i + 1,
          }));
    const last3 = history.map((x) => x.finish).filter((n) => Number.isFinite(n));
    return {
      ...h,
      history,
      last3: last3.length ? last3 : h.last3 || [],
    };
  });
}

export function summarizeHistory(horse) {
  const last3 = horse?.last3 || [];
  if (!last3.length) return "戦績なし";
  return `近走 ${last3.join("-")}`;
}

export const HorseHistoryManager = {
  enrich: enrichHorseHistory,
  summarize: summarizeHistory,
};
