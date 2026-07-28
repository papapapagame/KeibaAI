/* ========================================
   Demo seed for Learning AI — Ver5.5
   初回表示用（ロジック書換なし）
   ======================================== */

import {
  createLearningRecord,
  saveLearningDatabase,
  LEARNING_VERSION,
} from "./learning-db.js";
import { analyzeRaceResult } from "./result-analyzer.js";
import { explainLearning } from "./explain-learning.js";
import { appendHistoryEvent } from "./learning-history.js";
import { AI_VERSION, VERSION } from "../../js/config.js";

const DEMO_FLAG = "papapa_iq_learning_demo_v55";

export function ensureDemoLearningData(db) {
  try {
    if (localStorage.getItem(DEMO_FLAG) === "1" && (db.records || []).length) {
      return db;
    }
  } catch {
    /* ignore */
  }

  if ((db.records || []).some((r) => r.id && String(r.id).startsWith("demo_"))) {
    try {
      localStorage.setItem(DEMO_FLAG, "1");
    } catch {
      /* ignore */
    }
    return db;
  }

  const demos = buildDemoClosedRaces();
  let next = { ...db, records: [...(db.records || [])] };

  for (const demo of demos) {
    const analyzed = analyzeRaceResult(demo.prediction, demo.result, {});
    const explain = explainLearning(analyzed.diff, demo.result, []);
    const record = createLearningRecord({
      id: demo.id,
      timestamp: demo.timestamp,
      race: demo.race,
      prediction: demo.prediction,
      result: { ...analyzed.resultSummary, ...demo.result },
      diff: analyzed.diff,
      scores: demo.scores,
      analyzerSnapshot: demo.analyzerSnapshot,
      explain,
      metrics: { roi: analyzed.roi },
      engineVersion: AI_VERSION,
      learningVersion: LEARNING_VERSION,
      appVersion: VERSION,
    });
    next.records.push(record);
    next = appendHistoryEvent(next, {
      type: "learn",
      message: explain.summary,
      raceId: record.id,
    });
  }

  next = saveLearningDatabase(next);
  try {
    localStorage.setItem(DEMO_FLAG, "1");
  } catch {
    /* ignore */
  }
  return next;
}

function buildDemoClosedRaces() {
  return [
    {
      id: "demo_lr_001",
      timestamp: "2026-07-20T16:00:00+09:00",
      race: {
        date: "2026-07-20",
        venue: "tokyo",
        venueLabel: "東京",
        number: 11,
        name: "デモステークス",
      },
      prediction: { topNumbers: [1, 5, 3, 8, 2], topPopularity: 1 },
      result: {
        finishOrder: [1, 3, 5, 8, 2],
        winnerPopularity: 1,
        stake: 1000,
        payout: 1860,
        time: "1:33.0",
        last3f: "33.8",
        trackCondition: "良",
        weather: "晴",
        pace: "平均",
      },
      scores: {
        iqScore: 78,
        finalIqScore: 80,
        valueScore: 66,
        trustScore: 72,
      },
      analyzerSnapshot: {
        HorseAnalyzer: { hit: true, rankError: 1.2 },
        RaceAnalyzer: { hit: true, rankError: 1.5 },
        OddsAnalyzer: { hit: true, rankError: 2.0 },
        HistoryAnalyzer: { hit: true, rankError: 1.8 },
        TrendAnalyzer: { hit: false, rankError: 3.2 },
        MarketAnalyzer: { hit: true, rankError: 2.1 },
      },
    },
    {
      id: "demo_lr_002",
      timestamp: "2026-07-21T15:40:00+09:00",
      race: {
        date: "2026-07-21",
        venue: "hanshin",
        venueLabel: "阪神",
        number: 10,
        name: "学習検証戦",
      },
      prediction: { topNumbers: [4, 2, 7, 1, 9], topPopularity: 2 },
      result: {
        finishOrder: [7, 4, 2, 11, 1],
        winnerPopularity: 5,
        stake: 1000,
        payout: 0,
        time: "1:46.5",
        last3f: "34.9",
        trackCondition: "稍重",
        weather: "曇",
        pace: "ハイペース",
      },
      scores: {
        iqScore: 71,
        finalIqScore: 69,
        valueScore: 58,
        trustScore: 61,
      },
      analyzerSnapshot: {
        HorseAnalyzer: { hit: true, rankError: 2.4 },
        RaceAnalyzer: { hit: false, rankError: 4.1 },
        OddsAnalyzer: { hit: false, rankError: 3.8 },
        HistoryAnalyzer: { hit: true, rankError: 2.6 },
        TrendAnalyzer: { hit: true, rankError: 2.2 },
        MarketAnalyzer: { hit: false, rankError: 4.0 },
      },
    },
    {
      id: "demo_lr_003",
      timestamp: "2026-07-27T15:40:00+09:00",
      race: {
        date: "2026-07-27",
        venue: "tokyo",
        venueLabel: "東京",
        number: 7,
        name: "メインレース",
      },
      prediction: { topNumbers: [1, 5, 2, 8, 3], topPopularity: 1 },
      result: {
        finishOrder: [5, 1, 8, 2, 3],
        winnerPopularity: 4,
        stake: 1000,
        payout: 2450,
        time: "2:24.1",
        last3f: "34.2",
        trackCondition: "良",
        weather: "晴",
        pace: "スローペース",
      },
      scores: {
        iqScore: 82,
        finalIqScore: 84,
        valueScore: 70,
        trustScore: 76,
        valueOpportunity: 68,
      },
      analyzerSnapshot: {
        HorseAnalyzer: { hit: true, rankError: 1.1 },
        RaceAnalyzer: { hit: true, rankError: 1.4 },
        OddsAnalyzer: { hit: true, rankError: 1.9 },
        HistoryAnalyzer: { hit: true, rankError: 1.6 },
        TrendAnalyzer: { hit: true, rankError: 2.0 },
        MarketAnalyzer: { hit: true, rankError: 1.7 },
      },
    },
    {
      id: "demo_lr_004",
      timestamp: "2026-07-27T16:25:00+09:00",
      race: {
        date: "2026-07-27",
        venue: "tokyo",
        venueLabel: "東京",
        number: 8,
        name: "最終レース",
      },
      prediction: { topNumbers: [3, 6, 1, 10, 4], topPopularity: 3 },
      result: {
        finishOrder: [12, 3, 6, 4, 1],
        winnerPopularity: 9,
        stake: 1000,
        payout: 0,
        time: "1:24.8",
        last3f: "35.1",
        trackCondition: "良",
        weather: "晴",
        pace: "ハイペース",
      },
      scores: {
        iqScore: 64,
        finalIqScore: 62,
        valueScore: 52,
        trustScore: 58,
      },
      analyzerSnapshot: {
        HorseAnalyzer: { hit: false, rankError: 4.5 },
        RaceAnalyzer: { hit: true, rankError: 2.8 },
        OddsAnalyzer: { hit: false, rankError: 5.0 },
        HistoryAnalyzer: { hit: false, rankError: 4.2 },
        TrendAnalyzer: { hit: true, rankError: 2.5 },
        MarketAnalyzer: { hit: false, rankError: 4.8 },
      },
    },
  ];
}
