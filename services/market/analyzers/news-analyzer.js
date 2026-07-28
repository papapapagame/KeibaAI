/* ========================================
   NewsAnalyzer — Ver5.4
   本文は解析後に破棄。UIへは評価のみ返す。
   ======================================== */

import { clamp, extractSignalFlags, hashSeed } from "./utils.js";

export function analyzeNews(context = {}) {
  const aiInput = context.aiInput || {};
  const articles = Array.isArray(aiInput.news) ? aiInput.news : [];
  const started = Date.now();

  let positive = 0;
  let negative = 0;
  let attention = 0;
  let injury = 0;
  let jockeyChange = 0;
  let scratched = 0;

  // タイトル＋本文は内部解析のみ。結果オブジェクトに本文を載せない。
  for (const article of articles) {
    const blob = `${article.title || ""} ${article.body || ""} ${article.category || ""}`;
    const flags = extractSignalFlags(blob);
    if (flags.positive) positive += 1;
    if (flags.negative) negative += 1;
    if (flags.attention) attention += 1;
    if (flags.injury) injury += 1;
    if (flags.jockeyChange) jockeyChange += 1;
    if (flags.scratched) scratched += 1;
  }

  const seed = hashSeed(context.race?.number, articles.length, positive, negative);
  const analyzed = articles.length;
  const goodMaterial = clamp(40 + positive * 12 + attention * 4 + (seed % 5));
  const badMaterial = clamp(30 + negative * 14 + injury * 18 + scratched * 20);
  const attentionScore = clamp(35 + attention * 10 + analyzed * 4);
  const riskFromNews = clamp(20 + injury * 22 + jockeyChange * 10 + scratched * 25);

  return {
    analyzer: "NewsAnalyzer",
    status: analyzed > 0 ? "ONLINE" : "READY",
    fetchedCount: analyzed,
    analyzedCount: analyzed,
    // AI評価のみ（本文なし）
    evaluation: {
      goodMaterial,
      badMaterial,
      attention: attentionScore,
      injuryRisk: clamp(injury * 30),
      jockeyChangeRisk: clamp(jockeyChange * 25),
      scratchRisk: clamp(scratched * 40),
      riskFromNews,
    },
    responseMs: Date.now() - started,
    updatedAt: new Date().toISOString(),
    note: "Article bodies are not exposed to UI",
  };
}
