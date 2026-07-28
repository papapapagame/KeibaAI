/* ========================================
   Demo seed for Race Review — Ver6.5
   ======================================== */

import {
  REVIEW_DEMO_FLAG,
  REVIEW_VERSION,
  createKnowledgeRecord,
  saveKnowledgeBase,
  appendLessons,
  appendHorseMemo,
  mergeFutureWatch,
  appendHistory,
} from "./knowledge-manager.js";
import { analyzeWinner } from "./winner-analyzer.js";
import { analyzeLosers } from "./loser-analyzer.js";
import { analyzeRaceFlow } from "./race-flow-analyzer.js";
import { generateLessons } from "./lesson-generator.js";
import { buildFutureWatch } from "./future-prediction-manager.js";
import { buildHorseMemos } from "./horse-memo.js";
import { integrateSources } from "./review-sources.js";
import { buildLearningHandoff } from "./learning-bridge.js";
import { explainReview } from "./explain-review.js";

export function ensureDemoReviewData(kb) {
  try {
    if (localStorage.getItem(REVIEW_DEMO_FLAG) === "1" && (kb.reviews || []).length) {
      return kb;
    }
  } catch {
    /* ignore */
  }

  if ((kb.reviews || []).some((r) => String(r.id || "").startsWith("demo_rv_"))) {
    try {
      localStorage.setItem(REVIEW_DEMO_FLAG, "1");
    } catch {
      /* ignore */
    }
    return kb;
  }

  const demos = buildDemoRaces();
  let next = { ...kb, reviews: [...(kb.reviews || [])] };

  for (const demo of demos) {
    const sources = integrateSources(
      {
        races: [
          {
            raceId: demo.raceId,
            official: demo.race,
            lap: demo.lap,
            track: demo.track,
            weather: demo.weather,
            payout: demo.payout,
            marketX: demo.marketX,
            news: demo.news,
            jockeyComments: demo.jockeyComments,
            trainerComments: demo.trainerComments,
            expert: demo.expert,
            training: demo.training,
          },
        ],
      },
      demo.race
    );

    const raceFlow = analyzeRaceFlow({
      race: demo.race,
      entries: demo.entries,
      sources,
      prediction: demo.prediction,
      learningDiff: demo.learningDiff,
    });
    const winner = demo.entries.find((e) => e.finish === 1);
    const winnerAnalysis = analyzeWinner({
      winner,
      race: demo.race,
      sources,
      prediction: demo.prediction,
    });
    const loserAnalysis = analyzeLosers({
      entries: demo.entries,
      race: demo.race,
      sources,
      prediction: demo.prediction,
    });
    const lessons = generateLessons({
      raceFlow,
      winnerAnalysis,
      loserAnalysis,
      sources,
      predictionGap: raceFlow.predictionGap,
    });
    const futureWatch = buildFutureWatch({
      entries: demo.entries,
      winnerAnalysis,
      loserAnalysis,
      raceFlow,
      sources,
    });
    const horseMemos = buildHorseMemos({
      entries: demo.entries,
      winnerAnalysis,
      loserAnalysis,
      raceFlow,
      raceId: demo.raceId,
    });

    const bundle = {
      version: REVIEW_VERSION,
      raceId: demo.raceId,
      race: demo.race,
      entries: demo.entries,
      raceFlow,
      winnerAnalysis,
      loserAnalysis,
      lessons,
      futureWatch,
    };
    bundle.explainReview = explainReview(bundle);
    const learningPayload = buildLearningHandoff(bundle);

    const record = createKnowledgeRecord({
      id: demo.id,
      raceId: demo.raceId,
      horseId: winnerAnalysis.horseId,
      review: {
        overview: raceFlow.overview,
        development: raceFlow.development,
        pace: raceFlow.pace,
        track: raceFlow.track,
        popularity: raceFlow.popularity,
        marketPsych: raceFlow.marketPsych,
        predictionGap: raceFlow.predictionGap,
      },
      lessons: lessons.items,
      winnerAnalysis,
      loserAnalysis,
      futureWatch,
      learningPayload,
      timestamp: demo.timestamp,
    });

    next.reviews.unshift(record);
    next = appendLessons(next, lessons.items, demo.raceId);
    for (const memo of horseMemos) {
      next = appendHorseMemo(next, memo.horseId, memo);
    }
    next = mergeFutureWatch(next, futureWatch);
    next = appendHistory(next, {
      type: "demo_review",
      message: raceFlow.overview.summary,
      raceId: demo.raceId,
    });
  }

  next = saveKnowledgeBase(next);
  try {
    localStorage.setItem(REVIEW_DEMO_FLAG, "1");
  } catch {
    /* ignore */
  }
  return next;
}

function buildDemoRaces() {
  return [
    {
      id: "demo_rv_001",
      raceId: "hist-001",
      timestamp: "2026-07-20T16:10:00+09:00",
      race: {
        venueLabel: "東京",
        number: 11,
        track: "芝",
        distance: 1600,
        trackCondition: "良",
        name: "メインレース",
        date: "2026-07-20",
      },
      entries: [
        { number: 1, name: "ゴールドパパス", finish: 1, popularity: 1 },
        { number: 5, name: "シルバーノート", finish: 2, popularity: 4 },
        { number: 2, name: "ナイトリーガル", finish: 3, popularity: 3 },
        { number: 7, name: "ブラストライン", finish: 6, popularity: 2 },
      ],
      prediction: { topNumbers: [1, 5, 2], rankedNumbers: [1, 5, 2, 7] },
      learningDiff: { hit: true, summary: "本命的中" },
      lap: {
        paceLabel: "ハイ",
        first3f: 33.8,
        last3f: 34.1,
        summary: "前半速め。差しが届きやすい流れ。",
      },
      track: {
        condition: "良",
        bias: "やや外",
        speed: "高速",
        summary: "高速馬場。反応の速さが武器に。",
      },
      weather: "晴",
      payout: { win: 280, summary: "単勝水準は順当寄り" },
      marketX: {
        heat: 72,
        sentiment: "本命安心",
        overheat: false,
        summary: "1番人気への支持は堅め。過熱までは至らず。",
      },
      news: [
        {
          topic: "レース後総評",
          tone: "positive",
          summary: "勝ち馬の末脚持続が焦点になった（要約のみ）。",
        },
      ],
      jockeyComments: [
        {
          horseId: 1,
          sentiment: "positive",
          summary: "想定通りの位置で運べた（要約）。",
        },
        {
          horseId: 7,
          sentiment: "cautious",
          summary: "ペースが速く脚を使った（要約）。",
        },
      ],
      trainerComments: [
        {
          horseId: 1,
          sentiment: "positive",
          summary: "仕上がりは予定通り（要約）。",
        },
      ],
      expert: [
        {
          stance: "順当",
          focus: "末脚",
          summary: "高速馬場での反応差が決めた（要約）。",
        },
      ],
      training: [{ horseId: 1, tone: "仕上がり良", summary: "最終追いで気配上々（要約）。" }],
    },
    {
      id: "demo_rv_002",
      raceId: "hist-002",
      timestamp: "2026-07-13T16:15:00+09:00",
      race: {
        venueLabel: "東京",
        number: 11,
        track: "芝",
        distance: 1600,
        trackCondition: "良",
        name: "オープン",
        date: "2026-07-13",
      },
      entries: [
        { number: 8, name: "ダークコメット", finish: 1, popularity: 6 },
        { number: 1, name: "プライムフォース", finish: 2, popularity: 1 },
        { number: 4, name: "レイクミラー", finish: 3, popularity: 5 },
        { number: 3, name: "オーシャンビット", finish: 7, popularity: 2 },
      ],
      prediction: { topNumbers: [1, 5, 2], rankedNumbers: [1, 5, 2, 3] },
      learningDiff: { hit: false, summary: "本命2着・勝ち馬外し" },
      lap: {
        paceLabel: "スロー",
        first3f: 36.2,
        last3f: 33.5,
        summary: "スローからの瞬発力勝負。",
      },
      track: {
        condition: "良",
        bias: "内",
        speed: "標準",
        summary: "内枠先行が残りやすい馬場。",
      },
      weather: "曇",
      payout: { win: 1240, summary: "波乱寄りの払戻" },
      marketX: {
        heat: 88,
        sentiment: "本命過熱",
        overheat: true,
        summary: "1番人気への資金集中が強く、期待値が先行。",
      },
      news: [
        {
          topic: "波乱レース",
          tone: "surprise",
          summary: "人気薄の差し切りが話題（要約のみ）。",
        },
      ],
      jockeyComments: [
        {
          horseId: 1,
          sentiment: "cautious",
          summary: "流れが向かず一息つけず（要約）。",
        },
        {
          horseId: 8,
          sentiment: "positive",
          summary: "好位から一気に（要約）。",
        },
      ],
      trainerComments: [],
      expert: [
        {
          stance: "波乱",
          focus: "展開",
          summary: "スローで人気馬の位置取りがかみ合わず（要約）。",
        },
      ],
      training: [{ horseId: 3, tone: "普通", summary: "特段の上積み示唆なし（要約）。" }],
    },
  ];
}
