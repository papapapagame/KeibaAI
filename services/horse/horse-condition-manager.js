/* ========================================
   HorseConditionManager — Ver7.3
   ======================================== */

export function attachHorseConditions(horses = []) {
  return (horses || []).map((h) => {
    if (h.condition) return h;
    const last = (h.last3 || [])[0];
    let condition = "普通";
    if (last === 1) condition = "好調";
    else if (last >= 8) condition = "不安";
    else if (last >= 5) condition = "様子見";
    return { ...h, condition };
  });
}

export const HorseConditionManager = { attach: attachHorseConditions };
