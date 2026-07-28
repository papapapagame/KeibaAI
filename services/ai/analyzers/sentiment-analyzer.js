/* ========================================
   SentimentAnalyzer — Ver5.3
   X / ニュース / 予想サイト構造（今回はダミー+ニュースフィード）
   Support / Buzz / Risk
   ======================================== */

import { clamp, hashSeed } from "../utils.js";

export function analyzeSentiment(context = {}) {
  const aiInput = context.aiInput || {};
  const news = aiInput.news || [];
  const trends = aiInput.trends || [];
  const comments = aiInput.comments || [];
  const race = context.race || {};

  // TODO: Implement live X / tip-site sentiment when APIs are available.
  const seed = hashSeed(race.date, race.number, news.length, trends.length);

  const buzzFromTrends = trends.reduce(
    (s, t) => s + Number(t.volume || 0) + Number(t.score || 0) * 0.3,
    0
  );
  const supportFromNews = news.length * 8 + comments.length * 6;
  const dummyBuzz = 40 + (seed % 35);
  const dummySupport = 45 + ((seed * 3) % 30);
  const dummyRisk = 25 + ((seed * 7) % 40);

  const buzzScore = clamp(
    trends.length ? 35 + buzzFromTrends * 0.4 : dummyBuzz
  );
  const supportScore = clamp(
    news.length || comments.length ? 40 + supportFromNews : dummySupport
  );
  const riskScore = clamp(
    dummyRisk + (context.raceAnalysis?.complexity || 40) * 0.25
  );

  let marketSentiment = "中立";
  if (supportScore >= 70 && buzzScore >= 60) marketSentiment = "強気";
  else if (supportScore >= 58) marketSentiment = "やや強気";
  else if (riskScore >= 70) marketSentiment = "弱気";
  else if (supportScore < 45) marketSentiment = "やや弱気";

  return {
    analyzer: "SentimentAnalyzer",
    supportScore,
    buzzScore,
    riskScore,
    marketSentiment,
    sources: {
      news: news.length,
      trends: trends.length,
      comments: comments.length,
      x: 0, // TODO: X
      tipSites: 0, // TODO
    },
    note: "X/予想サイトは構造のみ。ニュースフィードがある場合は反映。",
  };
}
