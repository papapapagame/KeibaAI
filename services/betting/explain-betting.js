/* ========================================
   Explain Betting — Ver6.0
   ======================================== */

import { toNum } from "./utils.js";

export function explainTicket(ticket = {}, context = {}) {
  const scores = context.scores || {};
  const market = context.marketScores || {};
  const valueMap = new Map(
    (context.valueAnalysis?.horses || []).map((h) => [h.number, h])
  );
  const reasons = [];

  const avgEv = ticket.expectedValue || 0;
  if (avgEv >= 60) reasons.push("期待値が高い");
  if (toNum(scores.iqScore ?? scores.finalIqScore, 0) >= 70) {
    reasons.push("IQ Score上位");
  }
  if (toNum(market.supportScore, 0) >= 60) reasons.push("Market Score良好");
  if (toNum(market.supportScore, 0) >= 55 || toNum(scores.supportScore, 0) >= 55) {
    reasons.push("Support Score良好");
  }
  if (ticket.riskLevel === "Very Low" || ticket.riskLevel === "Low") {
    reasons.push("リスク低");
  }
  if (String(ticket.formation).includes("危険除外")) {
    reasons.push("危険馬を除外");
  }

  const styles = (context.horses || [])
    .filter((h) => (ticket.numbers || []).includes(h.number))
    .map((h) => h.runningStyle || "");
  if (styles.some((s) => s.includes("差") || s.includes("追"))) {
    reasons.push("展開一致（差し・追込余地）");
  } else if (styles.some((s) => s.includes("逃") || s.includes("先行"))) {
    reasons.push("展開一致（前目残りの想定）");
  }

  const track = context.race?.trackCondition || context.race?.condition || "";
  if (track) reasons.push(`馬場条件「${track}」を反映`);

  const under = (ticket.numbers || []).some((n) => valueMap.get(n)?.underbet);
  if (under) reasons.push("過小評価の妙味");

  const over = (ticket.numbers || []).some((n) => valueMap.get(n)?.overbet);
  if (over) reasons.push("過剰人気を避けた組み合わせ");

  if (context.learningHint) reasons.push(context.learningHint);

  if (!reasons.length) reasons.push("総合スコアに基づく推奨");

  return {
    reasons: reasons.slice(0, 6),
    summary: reasons.slice(0, 3).join(" / "),
  };
}

export function attachExplanations(tickets = [], context = {}) {
  return tickets.map((t) => {
    const explain = explainTicket(t, context);
    return { ...t, explain };
  });
}
