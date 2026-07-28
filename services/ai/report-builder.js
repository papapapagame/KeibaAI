/* ========================================
   AI Report Builder — Ver5.3
   ======================================== */

import { clamp, horseName } from "./utils.js";

export function buildReport(parts = {}, scores = {}, comments = {}, confidence = {}) {
  const top = parts.horseAnalysis?.top || [];
  const oddsA = parts.oddsAnalysis || {};
  const paceA = parts.paceAnalysis || {};
  const raceA = parts.raceAnalysis || {};

  const dangerHorse =
    oddsA.overbetList?.[0] ||
    [...(oddsA.horses || [])].sort(
      (a, b) => a.expectedValue - b.expectedValue
    )[0];
  const upsetHorse =
    oddsA.upsets?.[0] || oddsA.rankedEv?.find((h) => h.popularity >= 6);

  const evRanking = (oddsA.rankedEv || []).slice(0, 5).map((h, i) => ({
    rank: i + 1,
    number: h.number,
    name: h.name,
    expectedValue: h.expectedValue,
    odds: h.odds,
  }));

  const axis = top[0];
  const second = top[1];
  const third = top[2];
  const tickets = [];
  if (axis && second) {
    tickets.push({
      type: "馬連",
      text: `${axis.number}-${second.number}`,
      note: "本命〜対抗",
    });
  }
  if (axis && second && third) {
    tickets.push({
      type: "三連複",
      text: `${axis.number}-${second.number}-${third.number}`,
      note: "軸1頭流し簡易",
    });
  }
  if (upsetHorse && axis) {
    tickets.push({
      type: "ワイド",
      text: `${axis.number}-${upsetHorse.number}`,
      note: "穴押さえ",
    });
  }

  return {
    title: "AI REPORT",
    overview: comments.full || raceA.summary || "",
    pace: paceA.scenario || raceA.summary || "",
    danger: dangerHorse
      ? {
          number: dangerHorse.number,
          name: dangerHorse.name || horseName(dangerHorse),
          reason: dangerHorse.overbet
            ? "過剰人気の疑い"
            : "期待値が相対的に低い",
        }
      : null,
    upset: upsetHorse
      ? {
          number: upsetHorse.number,
          name: upsetHorse.name,
          reason: "人気薄でも能力・妙味が残る",
        }
      : null,
    evRanking,
    tickets,
    scores,
    confidence,
    focus: axis
      ? { number: axis.number, name: axis.name, score: axis.score }
      : null,
  };
}

export function buildConfidence(parts = {}, scores = {}) {
  const providersOnline = (parts.intelPacket?.providers || []).filter(
    (p) => p.status === "ONLINE" || (p.count || 0) > 0
  ).length;
  const historyDepth = parts.historyAnalysis?.depth || 0;
  const validationIssues =
    parts.intelPacket?.validationSummary?.issueCount || 0;

  let pct = 55;
  pct += Math.min(20, providersOnline * 4);
  pct += Math.min(12, historyDepth);
  pct += Math.min(8, (scores.trustScore || 50) / 15);
  pct -= Math.min(15, validationIssues);
  pct = clamp(pct);

  const stars = Math.max(1, Math.min(5, Math.round(pct / 20)));

  return {
    percent: pct,
    stars,
    starsLabel: "★".repeat(stars) + "☆".repeat(5 - stars),
    note:
      providersOnline >= 2
        ? "複数情報源を統合した信頼度"
        : "情報源が限定的なため控えめ",
  };
}
