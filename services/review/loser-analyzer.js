/* ========================================
   LoserAnalyzer — Ver6.5
   ======================================== */

import {
  clamp,
  horseName,
  hashSeed,
  pickVariant,
  popularHorses,
  toNum,
} from "./utils.js";

const LOSS_CODES = {
  pace: "ペース",
  trip: "位置取り",
  distance: "距離不適",
  track: "馬場不向き",
  interference: "不利",
  prep: "調整不足",
  market: "市場評価過大",
  flow: "展開不利",
};

/**
 * 人気馬・有力馬の敗因分析（Explain付き）
 */
export function analyzeLosers({
  entries = [],
  race,
  sources,
  prediction,
} = {}) {
  const sorted = [...entries].sort(
    (a, b) => toNum(a.finish, 99) - toNum(b.finish, 99)
  );
  const winner = sorted.find((e) => toNum(e.finish, 99) === 1);
  const favorites = popularHorses(entries, 3).filter(
    (e) => toNum(e.finish, 99) > 1
  );
  const predictedTops = (
    prediction?.topNumbers ||
    prediction?.rankedNumbers ||
    []
  ).map(Number);

  const aiMissed = predictedTops
    .map((n) => entries.find((e) => toNum(e.number) === n))
    .filter((e) => e && toNum(e.finish, 99) > 3);

  const targets = uniqueByHorse([...favorites, ...aiMissed]).slice(0, 5);

  const analyses = targets.map((horse) =>
    analyzeOneLoser(horse, {
      winner,
      race,
      sources,
      prediction,
    })
  );

  return {
    count: analyses.length,
    items: analyses,
    summary:
      analyses.length === 0
        ? "敗因分析対象の人気・有力馬は見つかりませんでした。"
        : `人気・有力馬 ${analyses.length} 頭について敗因を考察しました。`,
    explain:
      "敗因は結果着順・人気・ラップ・馬場・市場熱量・コメント要約から推論。" +
      "SNS・記事本文は使用せず、AIが統合した原因仮説のみを提示します。",
  };
}

function analyzeOneLoser(horse, ctx) {
  const name = horseName(horse);
  const finish = toNum(horse.finish, 99);
  const pop = toNum(horse.popularity, 99);
  const pace = ctx.sources?.lap?.paceLabel || "標準";
  const track = ctx.sources?.track?.condition || ctx.race?.trackCondition || "良";
  const seed = hashSeed(name, finish, pop, pace, track, "loser");

  const reasons = pickLossReasons(horse, ctx, pace, track, seed);
  const severity = clamp(40 + (pop <= 2 ? 25 : 12) + finish * 3 + (seed % 10));

  return {
    horseId: horse.horseId || horse.number || horse.id || null,
    number: horse.number ?? null,
    name,
    popularity: pop,
    finish,
    reasons,
    severity,
    severityLabel:
      severity >= 75 ? "明確な敗因" : severity >= 55 ? "複合要因" : "軽微〜運",
    nextWatch: severity >= 70 ? "危険人気候補" : "条件変更で再評価",
    explain: buildLoserExplain(name, pop, finish, reasons, pace, track),
  };
}

function pickLossReasons(horse, ctx, pace, track, seed) {
  const reasons = [];
  const finish = toNum(horse.finish, 99);
  const pop = toNum(horse.popularity, 99);

  if (pace === "ハイ" || pace === "超ハイ") {
    reasons.push({
      code: "pace",
      label: LOSS_CODES.pace,
      why: "ハイペースで脚を使い、直線の反応が鈍った可能性。",
    });
  } else if (pace === "スロー") {
    reasons.push({
      code: "flow",
      label: LOSS_CODES.flow,
      why: "スローで差し届かず、展開が先行有利に振れた可能性。",
    });
  } else {
    reasons.push({
      code: "trip",
      label: LOSS_CODES.trip,
      why: pickVariant(seed, [
        "位置取りが一つ後ろになり、流れに乗り切れなかった。",
        "コーナーでのロスが積み重なり、直線で差を詰めきれず。",
        "理想の進路を取れず、能力を出し切れなかった。",
      ]),
    });
  }

  if (track === "重" || track === "不良") {
    reasons.push({
      code: "track",
      label: LOSS_CODES.track,
      why: `${track}でのパワー要求に対し、持ち味が活きにくかった。`,
    });
  }

  const dist = toNum(ctx.race?.distance, 0);
  if (dist >= 2000 && finish >= 5) {
    reasons.push({
      code: "distance",
      label: LOSS_CODES.distance,
      why: "距離延長でスタミナ配分が難しく、末脚が足りなかった可能性。",
    });
  }

  if (pop <= 2 && finish >= 4) {
    reasons.push({
      code: "market",
      label: LOSS_CODES.market,
      why: "市場人気が能力以上に過熱し、期待値が先行していた可能性。",
    });
  }

  const market = ctx.sources?.marketX;
  if (market?.overheat && pop <= 3) {
    reasons.push({
      code: "market",
      label: LOSS_CODES.market,
      why: market.summary || "X市場の過熱と結果が乖離し、過大評価が露呈。",
    });
  }

  const camp = [...(ctx.sources?.jockeyComments || [])].find(
    (c) =>
      String(c.horseId) === String(horse.number) ||
      String(c.horseId) === String(horse.horseId)
  );
  if (camp && (camp.sentiment === "negative" || camp.sentiment === "cautious")) {
    reasons.push({
      code: "prep",
      label: LOSS_CODES.prep,
      why: camp.summary || "陣営コメント要約から調整・仕上がり懸念が示唆。",
    });
  }

  if (reasons.length < 2) {
    reasons.push({
      code: "interference",
      label: LOSS_CODES.interference,
      why: "走行中の小さな不利や他馬の動きでリズムを崩した可能性。",
    });
  }

  // unique by code
  const seen = new Set();
  return reasons
    .filter((r) => {
      if (seen.has(r.code)) return false;
      seen.add(r.code);
      return true;
    })
    .slice(0, 4);
}

function buildLoserExplain(name, pop, finish, reasons, pace, track) {
  const labels = reasons.map((r) => r.label).join("・");
  return (
    `${name}（人気${pop}→${finish}着）の敗因は「${labels}」と整理。` +
    `ペース${pace}・馬場${track}との相性を軸に、公開情報の要約から因果を推定した。` +
    `単なる着順表示ではなく、次走で警戒・再評価すべきポイントまで落とし込む。`
  );
}

function uniqueByHorse(list) {
  const seen = new Set();
  const out = [];
  for (const h of list) {
    const key = String(h.horseId || h.number || h.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out;
}

export const LoserAnalyzer = { analyze: analyzeLosers };
