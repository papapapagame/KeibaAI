/* ========================================
   SocialAnalyzer — Ver5.4 / Ver8.1 bridge
   X等の社会シグナル（本文非保存・非表示）
   Ver8.1: aiInput.social（構造化メタ）があれば優先
   ======================================== */

import { clamp, hashSeed } from "../utils.js";
import { buildXSearchPlan, summarizeXMetrics } from "../x-signals.js";

export function analyzeSocial(context = {}) {
  const plan = buildXSearchPlan(context);
  const started = Date.now();
  const structured = context.aiInput?.social || context.social || null;

  if (structured?.available && (structured.itemCount > 0 || structured.scores)) {
    const scores = structured.scores || {};
    const postCount = Number(structured.totalPosts) || 0;
    const support = clamp(Math.round((scores.attention || 50) * 0.7 + 15));
    const deny = clamp(Math.round(100 - (scores.confidence || 50)));
    const buzz = clamp(scores.momentum ?? scores.trend ?? 50);
    const topicHeat = clamp(scores.trend ?? scores.attention ?? 50);
    return {
      analyzer: "SocialAnalyzer",
      status: "STRUCTURED",
      implemented: true,
      fetchedCount: structured.itemCount || 0,
      analyzedCount: structured.itemCount || 0,
      searchPlan: {
        queryCount: plan.queries.length,
        sampleTags: (structured.topCategories || []).slice(0, 3),
        aiOnly: true,
      },
      metrics: {
        postCount,
        supportRate: support,
        denyRate: deny,
        topicHeat,
        buzz,
        risingWords: (structured.topCategories || []).slice(0, 3),
        trendScore: scores.trend ?? null,
        attentionScore: scores.attention ?? null,
        momentumScore: scores.momentum ?? null,
        confidenceScore: scores.confidence ?? null,
      },
      // 投稿本文は一切含めない
      responseMs: Date.now() - started,
      updatedAt: new Date().toISOString(),
      note: "Ver8.1 structured social metadata only. Posts never stored/displayed.",
    };
  }

  const seed = hashSeed(
    context.race?.date,
    context.race?.number,
    plan.queries.length
  );

  // TODO: Implement X API — use metrics only via summarizeXMetrics()
  const dummyMetrics = summarizeXMetrics({
    postCount: 20 + (seed % 80),
    supportRate: 45 + (seed % 40),
    denyRate: 10 + (seed % 25),
    buzzIndex: 35 + (seed % 50),
    risingWords: ["本命", "穴馬", "危険馬"].slice(0, 1 + (seed % 3)),
  });

  const support = clamp(dummyMetrics.supportRate ?? 50);
  const deny = clamp(dummyMetrics.denyRate ?? 20);
  const buzz = clamp(dummyMetrics.buzzIndex ?? 50);
  const topicHeat = clamp(40 + Math.min(40, dummyMetrics.postCount / 2));

  return {
    analyzer: "SocialAnalyzer",
    status: "READY", // live X not connected
    implemented: false,
    fetchedCount: 0,
    analyzedCount: dummyMetrics.postCount ? 1 : 0,
    searchPlan: {
      queryCount: plan.queries.length,
      sampleTags: ["#本命", "#穴馬", "#危険馬"],
      aiOnly: true,
    },
    metrics: {
      postCount: dummyMetrics.postCount,
      supportRate: support,
      denyRate: deny,
      topicHeat,
      buzz,
      risingWords: dummyMetrics.risingWords,
    },
    // 投稿本文は一切含めない
    responseMs: Date.now() - started,
    updatedAt: new Date().toISOString(),
    note: "TODO: X API. Posts are never stored or displayed.",
  };
}
