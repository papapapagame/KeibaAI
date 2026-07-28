/* ========================================
   PAPAPA IQ KEIBA - Intelligence Engine
   Ver5.3 AI Intelligence Engine
   取得データを統合解析（既存 ai-engine / thinking-engine は変更しない）
   ======================================== */

import { analyzeRace } from "./analyzers/race-analyzer.js";
import { analyzeHorses } from "./analyzers/horse-analyzer.js";
import { analyzeOdds } from "./analyzers/odds-analyzer.js";
import { analyzeHistory } from "./analyzers/history-analyzer.js";
import { analyzePace } from "./analyzers/pace-analyzer.js";
import { analyzeTrack } from "./analyzers/track-analyzer.js";
import { analyzeTrend } from "./analyzers/trend-analyzer.js";
import { analyzeSentiment } from "./analyzers/sentiment-analyzer.js";
import { buildScores } from "./score-builder.js";
import { buildExplanations } from "./explainable.js";
import { generateComments } from "./comment-generator.js";
import { buildConfidence, buildReport } from "./report-builder.js";

/**
 * @param {{
 *   race?: object,
 *   horses?: object[],
 *   intelPacket?: object
 * }} input
 */
export function runIntelligenceEngine(input = {}) {
  const race = input.race || {};
  const horses = Array.isArray(input.horses) ? input.horses : [];
  const intelPacket = input.intelPacket || {};
  const aiInput =
    intelPacket.fusedInput?.aiInput ||
    intelPacket.aiInput ||
    intelPacket.fusedInput?.normalized ||
    {};

  const baseCtx = { race, horses, aiInput, intelPacket };

  const raceAnalysis = analyzeRace(baseCtx);
  const horseAnalysis = analyzeHorses(baseCtx);
  const historyAnalysis = analyzeHistory(baseCtx);
  const paceAnalysis = analyzePace({ ...baseCtx, raceAnalysis });
  const trackAnalysis = analyzeTrack({ ...baseCtx, raceAnalysis });
  const trendAnalysis = analyzeTrend(baseCtx);
  const oddsAnalysis = analyzeOdds({ ...baseCtx, horseAnalysis });
  const sentimentAnalysis = analyzeSentiment({ ...baseCtx, raceAnalysis });

  const parts = {
    ...baseCtx,
    raceAnalysis,
    horseAnalysis,
    historyAnalysis,
    paceAnalysis,
    trackAnalysis,
    trendAnalysis,
    oddsAnalysis,
    sentimentAnalysis,
  };

  const scores = buildScores(parts);
  const explanations = buildExplanations(parts, scores);
  const comments = generateComments(parts, scores, explanations);
  const confidence = buildConfidence(parts, scores);
  const report = buildReport(parts, scores, comments, confidence);

  return {
    version: "5.3.0",
    engine: "AI Intelligence Engine",
    generatedAt: new Date().toISOString(),
    analyzers: {
      race: raceAnalysis,
      horse: horseAnalysis,
      odds: oddsAnalysis,
      history: historyAnalysis,
      pace: paceAnalysis,
      track: trackAnalysis,
      trend: trendAnalysis,
      sentiment: sentimentAnalysis,
    },
    scores,
    explanations,
    comments,
    confidence,
    report,
  };
}
