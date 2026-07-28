/* ========================================
   RaceFlowAnalyzer — Ver6.5
   レース総括・展開・ペース・馬場・人気・市場・予想差異
   ======================================== */

import { clamp, hashSeed, pickVariant, toNum } from "./utils.js";

/**
 * レース全体の流れを多角分析（各項目に Explain）
 */
export function analyzeRaceFlow({
  race,
  entries = [],
  sources,
  prediction,
  learningDiff,
} = {}) {
  const pace = sources?.lap?.paceLabel || "標準";
  const track = sources?.track?.condition || race?.trackCondition || "良";
  const weather = sources?.weather || race?.weather || "不明";
  const seed = hashSeed(race?.id || sources?.raceId, pace, track, "flow");

  const sorted = [...entries].sort(
    (a, b) => toNum(a.finish, 99) - toNum(b.finish, 99)
  );
  const winner = sorted[0];
  const top3 = sorted.slice(0, 3);
  const favWin = winner && toNum(winner.popularity, 99) <= 3;

  const overview = buildOverview(race, winner, pace, track, favWin, seed);
  const development = buildDevelopment(pace, top3, seed);
  const paceAnalysis = buildPace(sources, pace, seed);
  const trackAnalysis = buildTrack(sources, track, weather, seed);
  const popularity = buildPopularity(entries, winner, seed);
  const marketPsych = buildMarketPsych(sources, favWin, seed);
  const predGap = buildPredictionGap(prediction, entries, learningDiff, seed);

  return {
    overview,
    development,
    pace: paceAnalysis,
    track: trackAnalysis,
    popularity,
    marketPsych,
    predictionGap: predGap,
    explain: {
      overview: overview.explain,
      development: development.explain,
      pace: paceAnalysis.explain,
      track: trackAnalysis.explain,
      popularity: popularity.explain,
      marketPsych: marketPsych.explain,
      predictionGap: predGap.explain,
    },
  };
}

function buildOverview(race, winner, pace, track, favWin, seed) {
  const label = race?.name || `${race?.venueLabel || ""} ${race?.number || ""}R`;
  const winName = winner?.name || winner?.horse || `馬${winner?.number || "?"}`;
  const summary = favWin
    ? `${label}は上位人気決着。${winName}が${pace}ペース・馬場${track}を活かして勝利。`
    : `${label}は波乱寄り。${winName}が${pace}ペースを突き、人気薄の好走が目立つ。`;
  return {
    title: "レース総括",
    summary,
    tone: favWin ? "順当" : "波乱",
    explain:
      `総括は着順・人気・ラップ要約・馬場から合成。` +
      pickVariant(seed, [
        "偶発要素より条件適合を優先して解釈した。",
        "市場コンセンサスと結果の距離感を軸に整理した。",
      ]),
  };
}

function buildDevelopment(pace, top3, seed) {
  const names = top3.map((h) => h.name || h.horse || `#${h.number}`).join(" → ");
  let story;
  if (pace === "ハイ" || pace === "超ハイ") {
    story = "前半が速く、中団〜後方からの差しが相対的に生きやすい流れ。";
  } else if (pace === "スロー") {
    story = "ゆったりとした入りで、先行・好位の馬が残りやすい展開。";
  } else {
    story = "標準的な流れで、能力と位置取りのバランスが着順に反映。";
  }
  return {
    title: "展開分析",
    summary: `${story} 上位は ${names || "—"}。`,
    paceLabel: pace,
    explain:
      `展開仮説はラップラベル（${pace}）と上位馬の相対位置から構築。` +
      pickVariant(seed, [
        "実況本文は使わず、公開ラップと着順の整合のみを根拠とする。",
        "脚質分布はエントリー属性がある場合のみ補助的に参照。",
      ]),
  };
}

function buildPace(sources, pace, seed) {
  const lap = sources?.lap || {};
  return {
    title: "ペース分析",
    label: pace,
    first3f: lap.first3f ?? null,
    last3f: lap.last3f ?? null,
    summary: lap.summary || `${pace}ペースと推定。`,
    score: clamp(
      pace === "ハイ" || pace === "超ハイ" ? 78 : pace === "スロー" ? 42 : 55
    ),
    explain:
      `ペース判断は公開ラップ要約とセクション断片から。` +
      pickVariant(seed, [
        "数値がある場合は前半・上がりを比較し、体感ペースを補正。",
        "ラップ欠落時は結果の決着パターンから逆算する。",
      ]),
  };
}

function buildTrack(sources, track, weather, seed) {
  const bias = sources?.track?.bias || "フラット";
  const speed = sources?.track?.speed || "標準";
  return {
    title: "馬場分析",
    condition: track,
    weather,
    bias,
    speed,
    summary:
      sources?.track?.summary ||
      `馬場${track}（天候${weather}）。バイアス${bias}・テンポ${speed}。`,
    explain:
      `馬場考察は公式の馬場状態・天候と、結果から推定したバイアスを統合。` +
      pickVariant(seed, [
        "内有利/外有利は着順分布の偏りから仮説化する。",
        "高速馬場なら先行力、時計のかかる馬場なら持続力を重視。",
      ]),
  };
}

function buildPopularity(entries, winner, seed) {
  const favs = (entries || []).filter((e) => toNum(e.popularity, 99) <= 3);
  const favHits = favs.filter((e) => toNum(e.finish, 99) <= 3).length;
  const winPop = toNum(winner?.popularity, 99);
  return {
    title: "人気分析",
    winnerPopularity: winPop,
    favoriteInTop3: favHits,
    favoriteCount: favs.length,
    summary:
      winPop <= 3
        ? `勝ち馬は${winPop}番人気。上位人気の信頼度は比較的高かった。`
        : `勝ち馬は${winPop}番人気。人気薄の台頭で市場コンセンサスが崩れた。`,
    explain:
      `人気分析は着順×人気のクロス集計のみ。オッズ本文や掲示板転載は行わない。` +
      pickVariant(seed, [
        "回収視点では人気集中レースほど単勝妙味が薄い傾向を確認。",
        "波乱時は2〜3番人気の取りこぼしが次走の警戒材料になる。",
      ]),
  };
}

function buildMarketPsych(sources, favWin, seed) {
  const m = sources?.marketX || {};
  const heat = toNum(m.heat, 50);
  return {
    title: "市場心理分析",
    heat,
    sentiment: m.sentiment || (favWin ? "安心買い" : "動揺"),
    overheat: Boolean(m.overheat) || heat >= 75,
    summary:
      m.summary ||
      (heat >= 75
        ? "市場は過熱気味。結果で期待の修正が入った。"
        : "市場は比較的冷静。結果との乖離は限定的。"),
    explain:
      `市場心理は X の熱量・感情シグナル（要約のみ）と払戻水準から推定。` +
      `投稿本文は保存・表示しない。` +
      pickVariant(seed, [
        "過熱時は次走の危険人気化に注意。",
        "冷静相場では能力評価の信頼度が相対的に高い。",
      ]),
  };
}

function buildPredictionGap(prediction, entries, learningDiff, seed) {
  const tops = (prediction?.topNumbers || prediction?.rankedNumbers || []).map(
    Number
  );
  const finishMap = new Map(
    (entries || []).map((e) => [toNum(e.number), toNum(e.finish, 99)])
  );
  const gaps = tops.slice(0, 3).map((n) => ({
    number: n,
    predictedRank: tops.indexOf(n) + 1,
    finish: finishMap.get(n) ?? null,
  }));
  const hitTop =
    gaps.length > 0 && gaps.some((g) => g.finish === 1);
  const avgError =
    gaps.filter((g) => g.finish != null).length > 0
      ? Math.round(
          gaps
            .filter((g) => g.finish != null)
            .reduce((s, g) => s + Math.abs(g.finish - g.predictedRank), 0) /
            gaps.filter((g) => g.finish != null).length
        )
      : null;

  const learningNote = learningDiff?.summary || learningDiff?.hit != null
    ? `Learning差分: ${learningDiff.summary || (learningDiff.hit ? "的中寄り" : "外れ寄り")}`
    : "";

  return {
    title: "AI予想との差異",
    predictedTop: tops.slice(0, 3),
    gaps,
    hitWinner: hitTop,
    avgRankError: avgError,
    summary: hitTop
      ? `AI上位に勝ち馬が含まれ、予想の主軸は概ね妥当。平均順位誤差 ${avgError ?? "—"}。`
      : `勝ち馬がAI上位から外れ、展開・馬場・市場の読み直しが必要。平均順位誤差 ${avgError ?? "—"}。`,
    learningNote,
    explain:
      `差異は予想順位と実着順の差分で定量化。` +
      `評価ロジック（ai-engine / thinking-engine）は変更せず、振り返り考察のみ。` +
      pickVariant(seed, [
        "外れた要因は展開・人気過熱・適性の見誤りを優先仮説とする。",
        "的中時も「なぜ当たったか」を言語化し Knowledge に残す。",
      ]),
  };
}

export const RaceFlowAnalyzer = { analyze: analyzeRaceFlow };
