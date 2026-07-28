/* ========================================
   LessonGenerator — Ver6.5
   ======================================== */

import { hashSeed, pickVariant } from "./utils.js";

/**
 * レースから「今回学んだこと」を生成
 */
export function generateLessons({
  raceFlow,
  winnerAnalysis,
  loserAnalysis,
  sources,
  predictionGap,
} = {}) {
  const pace = raceFlow?.pace?.label || sources?.lap?.paceLabel || "標準";
  const track = raceFlow?.track?.condition || sources?.track?.condition || "良";
  const seed = hashSeed(pace, track, winnerAnalysis?.name, "lessons");
  const lessons = [];

  if (pace === "ハイ" || pace === "超ハイ") {
    lessons.push({
      id: `ls_pace_${seed}`,
      category: "pace",
      text: "ハイペース時は差し・追い込みの相対価値が上がる傾向を再認識。",
      why: raceFlow?.pace?.explain || "ラップ要約がハイ判定のため。",
    });
  } else if (pace === "スロー") {
    lessons.push({
      id: `ls_pace_${seed}`,
      category: "pace",
      text: "スローペースでは先行・好位の残りやすさを再確認。",
      why: "ゆったりした入りで位置取りの重要性が増した。",
    });
  } else {
    lessons.push({
      id: `ls_pace_${seed}`,
      category: "pace",
      text: "標準ペースでは基礎能力差が着順に出やすい。",
      why: "極端な流れがなく、能力評価の再現性が高かった。",
    });
  }

  if (track === "良" && (sources?.track?.speed === "高速" || pace !== "スロー")) {
    lessons.push({
      id: `ls_track_${seed}`,
      category: "track",
      text: "高速寄り馬場では先行力・反応の速さを重視する。",
      why: raceFlow?.track?.explain || "馬場テンポと決着パターンから。",
    });
  } else if (track === "重" || track === "不良") {
    lessons.push({
      id: `ls_track_${seed}`,
      category: "track",
      text: "時計のかかる馬場では持続力・パワー適性を再評価する。",
      why: `馬場${track}での着順分布を根拠に。`,
    });
  }

  if (raceFlow?.marketPsych?.overheat) {
    lessons.push({
      id: `ls_mkt_${seed}`,
      category: "market",
      text: "市場人気が過熱していた。次走の危険人気化に注意。",
      why: raceFlow?.marketPsych?.explain || "市場熱量シグナルが高水準。",
    });
  }

  if (predictionGap && !predictionGap.hitWinner) {
    lessons.push({
      id: `ls_pred_${seed}`,
      category: "prediction",
      text: "AI上位から勝ち馬が外れ、展開・適性の仮説を見直す必要あり。",
      why: predictionGap.explain || "予想順位と着順の乖離。",
    });
  } else if (predictionGap?.hitWinner) {
    lessons.push({
      id: `ls_pred_${seed}`,
      category: "prediction",
      text: "勝ち馬を上位に捉えられており、主軸読みは概ね妥当だった。",
      why: "的中要因を Knowledge に残し再現性を高める。",
    });
  }

  for (const loser of (loserAnalysis?.items || []).slice(0, 2)) {
    const topReason = loser.reasons?.[0];
    if (!topReason) continue;
    lessons.push({
      id: `ls_loser_${loser.horseId || loser.number}_${seed}`,
      category: "loser",
      text: `${loser.name}の敗因「${topReason.label}」は同条件で再発しうる。`,
      why: loser.explain,
    });
  }

  if (winnerAnalysis?.futureExpectation?.score >= 75) {
    lessons.push({
      id: `ls_win_${seed}`,
      category: "winner",
      text: `${winnerAnalysis.name}は次走も条件次第で中心候補。勝因の再現性を追う。`,
      why: winnerAnalysis.explain,
    });
  }

  if (lessons.length < 3) {
    lessons.push({
      id: `ls_gen_${seed}`,
      category: "general",
      text: pickVariant(seed, [
        "公開情報の要約だけでも、勝敗の因果は十分に言語化できる。",
        "人気と能力のギャップを毎回メモすることが長期精度につながる。",
        "展開仮説を事前に固定しすぎないことが外れレースの学び。",
      ]),
      why: "レース横断のメタ学習として Knowledge Base に蓄積。",
    });
  }

  return {
    items: lessons.slice(0, 8),
    summary: `今回学んだこと ${Math.min(lessons.length, 8)} 件を生成。`,
    explain:
      "Lessons はレース総括・勝敗分析・市場心理から抽出した再現可能な知見。" +
      "記事・投稿の転載ではなく、AIの考察文のみを Knowledge に保存する。",
  };
}

export const LessonGenerator = { generate: generateLessons };
