/* ========================================
   BankrollManager — Ver6.0
   ======================================== */

export const BUDGET_PRESETS = [1000, 3000, 5000, 10000];

/**
 * 予算を 本線 / 押さえ / 穴 に配分
 */
export function allocateBankroll(budget = 3000, plan = {}) {
  const amount = Math.max(100, Math.round(Number(budget) || 1000));
  const riskLevel = plan.riskLevel || "Medium";

  let mainRatio = 0.6;
  let coverRatio = 0.27;
  let upsetRatio = 0.13;

  if (riskLevel === "Very Low" || riskLevel === "Low") {
    mainRatio = 0.7;
    coverRatio = 0.22;
    upsetRatio = 0.08;
  } else if (riskLevel === "High" || riskLevel === "Very High") {
    mainRatio = 0.5;
    coverRatio = 0.28;
    upsetRatio = 0.22;
  }

  const main = round100(amount * mainRatio);
  const cover = round100(amount * coverRatio);
  let upset = amount - main - cover;
  if (upset < 100 && amount >= 300) {
    upset = 100;
  }

  return {
    budget: amount,
    allocation: {
      本線: main,
      押さえ: cover,
      穴: Math.max(0, upset),
    },
    note: `${amount}円を本線/押さえ/穴へ配分（リスク ${riskLevel}）`,
  };
}

export function distributeToTickets(tickets = [], bankroll = {}) {
  const alloc = bankroll.allocation || {};
  const main = alloc["本線"] || 0;
  const cover = alloc["押さえ"] || 0;
  const upset = alloc["穴"] || 0;
  const sorted = [...tickets];
  const out = [];

  sorted.forEach((t, idx) => {
    let purse = cover;
    if (idx === 0) purse = main;
    else if (idx >= sorted.length - 1 || String(t.formation).includes("穴"))
      purse = upset || cover;
    else if (idx === 1) purse = cover;

    const unit = Math.max(100, round100(purse / Math.max(1, t.points || 1)));
    out.push({
      ...t,
      stake: unit * Math.max(1, t.points || 1),
      unitStake: unit,
    });
  });

  return out;
}

function round100(n) {
  return Math.max(0, Math.round(Number(n) / 100) * 100);
}
