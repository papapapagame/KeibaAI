/* ========================================
   WinnerAnalyzer — Ver6.5
   ======================================== */

import {
  clamp,
  horseName,
  pickVariant,
  hashSeed,
  toNum,
} from "./utils.js";

/**
 * 勝ち馬の勝因・好走要因・能力・今後期待・適性を分析（Explain付き）
 */
export function analyzeWinner({ winner, race, sources, prediction } = {}) {
  if (!winner) {
    return {
      horseId: null,
      name: "—",
      winFactors: [],
      runFactors: [],
      ability: { score: 0, label: "不明" },
      futureExpectation: { score: 0, label: "—" },
      aptitude: [],
      explain: "勝ち馬データが不足しているため考察を保留しました。",
    };
  }

  const name = horseName(winner);
  const pop = toNum(winner.popularity, 99);
  const pace = sources?.lap?.paceLabel || "標準";
  const track = sources?.track?.condition || race?.trackCondition || "良";
  const seed = hashSeed(name, pop, pace, track, "winner");

  const winFactors = buildWinFactors(winner, pace, track, pop, seed);
  const runFactors = buildRunFactors(winner, sources, seed);
  const abilityScore = clamp(
    62 + (pop <= 2 ? 12 : pop <= 5 ? 6 : 18) + (seed % 11) - (pop > 8 ? 4 : 0)
  );
  const futureScore = clamp(
    abilityScore + (pace === "ハイ" ? 4 : 0) + (pop >= 4 ? 5 : -2) - (seed % 5)
  );

  const aptitude = buildAptitude(race, track, pace, seed);
  const explain = buildExplain(name, winFactors, pop, pace, track, prediction);

  return {
    horseId: winner.horseId || winner.number || winner.id || null,
    number: winner.number ?? null,
    name,
    popularity: pop,
    finish: toNum(winner.finish, 1),
    winFactors,
    runFactors,
    ability: {
      score: abilityScore,
      label: abilityScore >= 80 ? "高評価" : abilityScore >= 65 ? "安定" : "再評価待ち",
    },
    futureExpectation: {
      score: futureScore,
      label:
        futureScore >= 78
          ? "次走も注目"
          : futureScore >= 60
            ? "条件次第"
            : "過信注意",
    },
    aptitude,
    explain,
  };
}

function buildWinFactors(winner, pace, track, pop, seed) {
  const factors = [];
  if (pace === "ハイ" || pace === "超ハイ") {
    factors.push({
      code: "pace_suit",
      label: "ハイペース耐性",
      why: "前半ラップが速く、末脚を温存できた馬が相対的に有利だった。",
    });
  } else if (pace === "スロー") {
    factors.push({
      code: "position",
      label: "位置取り成功",
      why: "スローで先行・好位が決まりやすく、勝ち馬は流れに乗れた。",
    });
  } else {
    factors.push({
      code: "balance",
      label: "総合力の再現",
      why: "標準ペースで能力差が出やすく、勝ち馬の基礎力が表に出た。",
    });
  }

  if (track === "重" || track === "不良") {
    factors.push({
      code: "track_apt",
      label: "馬場適性",
      why: `${track}馬場でパワー・リズムを維持できた点が勝因。`,
    });
  } else {
    factors.push({
      code: "finish",
      label: "終いの加速",
      why: pickVariant(seed, [
        "直線での反応が良く、押し切り／差し切りが決まった。",
        "ラストの伸びが他馬より持続し、着差を広げた。",
        "ギアチェンジのタイミングが展開と噛み合った。",
      ]),
    });
  }

  if (pop >= 4) {
    factors.push({
      code: "market_gap",
      label: "市場過小評価の是正",
      why: `人気${pop}番手からの勝利で、事前評価に対し能力が上回った可能性。`,
    });
  } else {
    factors.push({
      code: "favorite_ok",
      label: "能力通りの決着",
      why: "上位人気の期待に応える内容で、評価の妥当性が確認された。",
    });
  }

  return factors.slice(0, 4);
}

function buildRunFactors(winner, sources, seed) {
  const comments = [
    ...(sources?.jockeyComments || []),
    ...(sources?.trainerComments || []),
  ].filter(
    (c) =>
      c.horseId == null ||
      String(c.horseId) === String(winner.number) ||
      String(c.horseId) === String(winner.horseId)
  );

  const factors = [
    {
      code: "trip",
      label: "競馬内容",
      why: pickVariant(seed, [
        "ロスの少ないコース取りでパフォーマンスを最大化した。",
        "スタート〜中盤のリズムが安定し、余力を残せた。",
        "他馬の動きに合わせた判断が功を奏した。",
      ]),
    },
  ];

  if (comments.length) {
    factors.push({
      code: "camp_signal",
      label: "陣営シグナル整合",
      why: comments[0].summary || "騎手・調教師コメント要約と結果が整合。",
    });
  }

  const train = (sources?.training || []).find(
    (t) =>
      String(t.horseId) === String(winner.number) ||
      String(t.horseId) === String(winner.horseId)
  );
  if (train) {
    factors.push({
      code: "prep",
      label: "調整の再現",
      why: train.summary || "調教トーンと本番の反応が一致した。",
    });
  }

  return factors;
}

function buildAptitude(race, track, pace, seed) {
  const dist = toNum(race?.distance, 1600);
  const surface = race?.track || "芝";
  return [
    {
      label: `${surface}${dist}m`,
      fit: "適合",
      why: "今回の条件で勝ち切り、再現性を確認。",
    },
    {
      label: `${track}馬場`,
      fit: track === "重" || track === "不良" ? "条件付き得意" : "標準〜得意",
      why: `今回の馬場（${track}）でのパフォーマンスが裏付け。`,
    },
    {
      label: `${pace}ペース`,
      fit: "今回マッチ",
      why: pickVariant(seed, [
        "同様の流れなら再度好走候補。",
        "ペース変化には注意しつつも適性は高い。",
      ]),
    },
  ];
}

function buildExplain(name, factors, pop, pace, track, prediction) {
  const tops = prediction?.topNumbers || prediction?.rankedNumbers || [];
  const predicted =
    Array.isArray(tops) && tops.length
      ? `AI上位予想は ${tops.slice(0, 3).join("-")}。`
      : "事前予想との差分は別セクションで詳述。";
  const core = factors
    .slice(0, 2)
    .map((f) => f.label)
    .join("／");
  return (
    `${name}の勝利は「${core}」が主因。` +
    `人気${pop}・${pace}ペース・馬場${track}を総合すると、` +
    `勝ち切れは偶発というより条件適合の結果と見る。${predicted}` +
    `結論の根拠は公開結果・ラップ・馬場・市場反応の統合要約のみ（本文転載なし）。`
  );
}

export const WinnerAnalyzer = { analyze: analyzeWinner };
