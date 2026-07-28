/* ========================================
   Explain Learning — Ver5.5
   「なぜ学習したか」説明（ロジック自動書換はしない）
   ======================================== */

export function explainLearning(diff = {}, result = {}, analyzerStats = []) {
  const lines = [];

  if (diff.hitWin) {
    lines.push("本命評価が結果と一致したため、現在の軸選定パターンを維持する学習です。");
  } else if (diff.hitPlace) {
    lines.push("複勝圏までは捉えたため、上位候補の幅は妥当と記録しました。");
  } else {
    lines.push("上位予想と着順にズレがあったため、差分を学習履歴へ保存しました。");
  }

  const pace = String(result.pace || result.tenkai || "");
  if (pace.includes("ハイ") || pace.includes("高速")) {
    lines.push("高速馬場／ハイペース寄りの展開だったため、差し馬評価を少し上げる改善提案を残しました。");
  } else if (pace.includes("スロー")) {
    lines.push("スロー展開だったため、先行有利補正の見直し提案を記録しました。");
  }

  if (Number(result.winnerPopularity) === 1 && !diff.hitWin) {
    lines.push("人気補正を弱める提案（過剰人気の見誤り防止）を残しました。");
  }

  const weak = analyzerStats.find((a) => a.accuracy < 60);
  if (weak) {
    lines.push(`${weak.name} の寄与を将来下げる候補としてマークしました。`);
  }

  const strong = analyzerStats.find((a) => a.accuracy >= 85);
  if (strong) {
    lines.push(`${strong.name} の安定性が高いため、信頼度を維持する記録です。`);
  }

  if (!lines.length) {
    lines.push("結果と予想の差分を学習データベースへ蓄積しました。");
  }

  return {
    summary: lines[0],
    details: lines,
    autoRewrite: false,
  };
}
