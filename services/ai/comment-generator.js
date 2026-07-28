/* ========================================
   AI Comment Generator — Ver5.3
   複数パターン組み合わせ（固定テンプレ連発を避ける）
   ======================================== */

import { hashSeed, pickVariant } from "./utils.js";

export function generateComments(parts = {}, scores = {}, explanations = {}) {
  const race = parts.race || {};
  const raceA = parts.raceAnalysis || {};
  const paceA = parts.paceAnalysis || {};
  const trackA = parts.trackAnalysis || {};
  const oddsA = parts.oddsAnalysis || {};
  const top = parts.horseAnalysis?.top?.[0];
  const upset = oddsA.upsets?.[0];
  const danger = oddsA.overbetList?.[0];
  const seed = hashSeed(
    race.date,
    race.number,
    scores.iqScore,
    top?.number,
    Date.now() % 7
  );

  const paceLine = pickVariant(seed, [
    `展開は${paceA.pacePrediction || "平均"}想定。${paceA.scenario || ""}`,
    `${raceA.escapeCount || 0}頭の逃げ候補が絡み、${paceA.pacePrediction || "平均"}になりやすい。`,
    `脚質分布から見ると${paceA.pacePrediction || "平均"}ペースが軸になる。`,
  ]);

  const styleLine = pickVariant(seed + 1, [
    top
      ? `軸候補の${top.name}は${top.runningStyle || "自在"}向きの組み立てが噛み合う。`
      : "脚質適性は隊列次第で上下する。",
    raceA.closerFavored
      ? "差し有利の流れなら後方待機勢の評価を一段上げたい。"
      : "先行有利なら前目の馬を厚めに取る判断が妥当。",
    `コース適性・脚質適性の両立がIQ ${scores.iqScore} の支えになっている。`,
  ]);

  const trackLine = pickVariant(seed + 2, [
    `馬場は${trackA.surface || "芝"}の${trackA.condition || "良"}想定（${trackA.bias || "フラット"}）。`,
    `天候${trackA.weather || "晴"}・馬場バイアス「${trackA.bias || "フラット"}」を織り込む。`,
    `${trackA.venueLabel || "開催場"}の馬場傾向は現時点で${trackA.bias || "フラット"}寄り。`,
  ]);

  const jockeyLine = pickVariant(seed + 3, [
    top
      ? `騎手面では${parts.horses?.find((h) => h.number === top.number)?.jockey || "主戦"}の操縦が鍵。`
      : "騎手のペース感覚が勝敗を分けやすい。",
    `厩舎・騎手の近走傾向も Trust ${scores.trustScore} に反映済み。`,
  ]);

  const popLine = pickVariant(seed + 4, [
    danger
      ? `${danger.name}は人気先行の気配があり、過剰人気リスクを警戒。`
      : "人気と能力のズレは比較的穏やか。",
    oddsA.rankedEv?.[0]
      ? `人気薄でも妙味があるのは ${oddsA.rankedEv[0].name}（EV ${oddsA.rankedEv[0].expectedValue}）。`
      : "オッズ妙味は様子見。",
  ]);

  const evLine = pickVariant(seed + 5, [
    `Value Score ${scores.valueScore}。期待値上位を買い目の核にする。`,
    explanations.factors?.find((f) => f.label === "期待値")
      ? `期待値寄与 ${formatDelta(explanations.factors.find((f) => f.label === "期待値").delta)} がIQを押し上げ。`
      : "期待値は堅実寄り。",
  ]);

  const dangerLine = pickVariant(seed + 6, [
    `Danger Score ${scores.dangerScore}。展開難易度と人気歪みを同時に見る。`,
    upset
      ? `穴候補は${upset.name}。人気薄でも能力が残るタイプ。`
      : "極端な穴狙いは抑えめが無難。",
  ]);

  const reasonLine = pickVariant(seed + 7, [
    top
      ? `推奨理由は ${top.name} の距離・コース適性と近走の安定。`
      : "推奨理由はレース全体の再現性の高さ。",
    `IQ ${scores.iqScore} / Trust ${scores.trustScore} のバランスが今回の推し根拠。`,
    explanations.factors?.[0]
      ? `最大寄与は「${explanations.factors[0].label} ${formatDelta(explanations.factors[0].delta)}」。`
      : "複合要因で評価を形成。",
  ]);

  const paragraphs = [
    paceLine,
    styleLine,
    trackLine,
    jockeyLine,
    popLine,
    evLine,
    dangerLine,
    reasonLine,
  ].filter(Boolean);

  return {
    full: paragraphs.join(" "),
    parts: {
      pace: paceLine,
      style: styleLine,
      track: trackLine,
      jockey: jockeyLine,
      popularity: popLine,
      expectedValue: evLine,
      danger: dangerLine,
      reason: reasonLine,
    },
  };
}

function formatDelta(n) {
  const v = Number(n) || 0;
  return v > 0 ? `+${v}` : String(v);
}
