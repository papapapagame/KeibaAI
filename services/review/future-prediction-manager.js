/* ========================================
   FuturePredictionManager — Ver6.5
   次走注目 / 危険人気 / 上昇 / 下降
   ======================================== */

import { clamp, horseName, hashSeed, toNum } from "./utils.js";

/**
 * Future Watch List を選出（各項目に理由・Explain）
 */
export function buildFutureWatch({
  entries = [],
  winnerAnalysis,
  loserAnalysis,
  raceFlow,
  sources,
} = {}) {
  const nextWatch = [];
  const dangerFavorites = [];
  const rising = [];
  const falling = [];

  if (winnerAnalysis?.horseId != null || winnerAnalysis?.number != null) {
    const score = toNum(winnerAnalysis.futureExpectation?.score, 70);
    nextWatch.push({
      type: "next_watch",
      horseId: winnerAnalysis.horseId,
      number: winnerAnalysis.number,
      name: winnerAnalysis.name,
      score,
      reason: "勝ち切りの内容に再現性があり、次走も中心候補。",
      explain: winnerAnalysis.explain,
    });
  }

  for (const loser of loserAnalysis?.items || []) {
    const marketOver =
      (loser.reasons || []).some((r) => r.code === "market") ||
      raceFlow?.marketPsych?.overheat;
    if (marketOver || toNum(loser.popularity, 99) <= 2) {
      dangerFavorites.push({
        type: "danger_favorite",
        horseId: loser.horseId,
        number: loser.number,
        name: loser.name,
        score: clamp(loser.severity),
        reason: `人気${loser.popularity}が結果と乖離。次走も過熱しやすい。`,
        explain: loser.explain,
      });
    }

    const tripOrPace = (loser.reasons || []).some((r) =>
      ["flow", "pace", "trip", "interference"].includes(r.code)
    );
    if (tripOrPace && toNum(loser.finish, 99) <= 8) {
      rising.push({
        type: "rising",
        horseId: loser.horseId,
        number: loser.number,
        name: loser.name,
        score: clamp(100 - toNum(loser.finish, 10) * 8 + (20 - toNum(loser.popularity, 5))),
        reason: "敗因が展開寄りで、条件が変われば上昇余地。",
        explain: loser.explain,
      });
    }

    const aptLoss = (loser.reasons || []).some((r) =>
      ["distance", "track", "prep", "market"].includes(r.code)
    );
    if (aptLoss && toNum(loser.popularity, 99) <= 4) {
      falling.push({
        type: "falling",
        horseId: loser.horseId,
        number: loser.number,
        name: loser.name,
        score: clamp(loser.severity - 10),
        reason: "適性・調整・過大評価の敗因が重なり、評価は慎重に下げる。",
        explain: loser.explain,
      });
    }
  }

  // 穴で好走した馬を上昇に追加
  for (const e of entries) {
    const finish = toNum(e.finish, 99);
    const pop = toNum(e.popularity, 99);
    if (finish <= 3 && pop >= 5) {
      rising.push({
        type: "rising",
        horseId: e.horseId || e.number,
        number: e.number,
        name: horseName(e),
        score: clamp(70 + (10 - finish) * 5 + Math.min(pop, 10)),
        reason: `人気${pop}から${finish}着。能力の再評価が必要。`,
        explain:
          "人気薄の好走は市場ギャップの是正シグナル。" +
          "次走は過熱に注意しつつ注目リストへ。",
      });
    }
  }

  // 調教・ニュースシグナルからの補助
  for (const sig of sources?.signals || []) {
    if (sig.horseId == null) continue;
    const entry = entries.find(
      (e) =>
        String(e.number) === String(sig.horseId) ||
        String(e.horseId) === String(sig.horseId)
    );
    if (!entry) continue;
    if (sig.tone === "positive" && toNum(entry.finish, 99) <= 5) {
      nextWatch.push({
        type: "next_watch",
        horseId: entry.horseId || entry.number,
        number: entry.number,
        name: horseName(entry),
        score: clamp(60 + toNum(sig.strength, 40) / 2),
        reason: sig.summary || "公開シグナルが前向き。",
        explain: "ニュース／調教などの要約シグナルと着順が整合。",
      });
    }
  }

  const dedupe = (list) => {
    const seen = new Set();
    return list.filter((item) => {
      const key = `${item.type}:${item.horseId || item.number}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const result = {
    nextWatch: dedupe(nextWatch)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5),
    dangerFavorites: dedupe(dangerFavorites)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5),
    rising: dedupe(rising)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5),
    falling: dedupe(falling)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5),
  };

  result.explain =
    "Future Watch は勝因・敗因・市場過熱・着順×人気ギャップから選出。" +
    "評価エンジンの内部ロジックは変更せず、次走の観察リストとして提示する。" +
    `seed=${hashSeed(result.nextWatch[0]?.name, result.dangerFavorites[0]?.name)}`;

  result.summary = [
    `次走注目 ${result.nextWatch.length}`,
    `危険人気 ${result.dangerFavorites.length}`,
    `上昇 ${result.rising.length}`,
    `下降 ${result.falling.length}`,
  ].join(" / ");

  return result;
}

export const FuturePredictionManager = { build: buildFutureWatch };
