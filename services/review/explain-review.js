/* ========================================
   Explain Review — Ver6.5
   各考察に「なぜその結論か」を必ず付与
   ======================================== */

/**
 * レビュー成果物へ Explain を横断付与・整形
 */
export function explainReview(bundle) {
  const sections = [];

  const push = (title, conclusion, why) => {
    if (!conclusion && !why) return;
    sections.push({
      title,
      conclusion: conclusion || "",
      why: why || "公開情報の要約と着順・人気の整合から導いた。",
    });
  };

  const flow = bundle?.raceFlow;
  if (flow) {
    push("レース総括", flow.overview?.summary, flow.overview?.explain);
    push("展開分析", flow.development?.summary, flow.development?.explain);
    push("ペース分析", flow.pace?.summary, flow.pace?.explain);
    push("馬場分析", flow.track?.summary, flow.track?.explain);
    push("人気分析", flow.popularity?.summary, flow.popularity?.explain);
    push("市場心理", flow.marketPsych?.summary, flow.marketPsych?.explain);
    push(
      "AI予想との差異",
      flow.predictionGap?.summary,
      flow.predictionGap?.explain
    );
  }

  if (bundle?.winnerAnalysis) {
    push(
      "勝ち馬分析",
      `${bundle.winnerAnalysis.name}：${(bundle.winnerAnalysis.winFactors || [])
        .map((f) => f.label)
        .join(" / ")}`,
      bundle.winnerAnalysis.explain
    );
  }

  for (const loser of bundle?.loserAnalysis?.items || []) {
    push(
      `敗因分析 ${loser.name}`,
      (loser.reasons || []).map((r) => r.label).join(" / "),
      loser.explain
    );
  }

  for (const lesson of bundle?.lessons?.items || []) {
    push("Lesson", lesson.text, lesson.why);
  }

  const watch = bundle?.futureWatch;
  if (watch) {
    for (const item of [
      ...(watch.nextWatch || []),
      ...(watch.dangerFavorites || []),
    ].slice(0, 6)) {
      push(`Watch ${item.name}`, item.reason, item.explain);
    }
  }

  return {
    policy: {
      plainResultForbidden: true,
      mustExplainWhy: true,
      bodiesForbidden: true,
    },
    sections,
    summary:
      sections.length > 0
        ? `Explain Review ${sections.length} 項目（結論＋理由）。`
        : "Explain 対象なし",
  };
}

export const ExplainReview = { build: explainReview };
