/* ========================================
   Review Dashboard API — Ver6.5
   ======================================== */

import {
  loadKnowledgeBase,
  getKnowledgeStats,
  clearKnowledgeBase,
  REVIEW_VERSION,
  REVIEW_DEMO_FLAG,
} from "./knowledge-manager.js";
import { ensureDemoReviewData } from "./seed-demo.js";
import { runRaceReview } from "./race-review-engine.js";
import { loadJson } from "../../js/utils.js";

/**
 * Review Dashboard 用データ
 */
export function getReviewDashboard(options = {}) {
  let kb = loadKnowledgeBase();
  if (options.ensureDemo !== false) {
    kb = ensureDemoReviewData(kb);
  }

  const stats = getKnowledgeStats(kb);
  const reviews = kb.reviews || [];
  const latest = reviews[0] || null;

  const recentLessons = (kb.lessons || []).slice(0, 12);
  const nextWatch = (kb.futureWatch || [])
    .filter((w) => w.type === "next_watch")
    .slice(0, 8);
  const dangerFavorites = (kb.futureWatch || [])
    .filter((w) => w.type === "danger_favorite")
    .slice(0, 8);
  const rising = (kb.futureWatch || [])
    .filter((w) => w.type === "rising")
    .slice(0, 6);
  const falling = (kb.futureWatch || [])
    .filter((w) => w.type === "falling")
    .slice(0, 6);

  const memoList = Object.values(kb.horseMemos || {})
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .slice(0, 12);

  const history = (kb.history || []).slice(0, 20);

  return {
    version: REVIEW_VERSION,
    policy: {
      bodiesForbidden: true,
      aiSummaryOnly: true,
      autoRewriteForbidden: true,
    },
    stats,
    latestReview: latest
      ? {
          id: latest.id,
          raceId: latest.raceId,
          summary: latest.review?.overview?.summary || "",
          development: latest.review?.development?.summary || "",
          pace: latest.review?.pace?.summary || "",
          track: latest.review?.track?.summary || "",
          popularity: latest.review?.popularity?.summary || "",
          marketPsych: latest.review?.marketPsych?.summary || "",
          predictionGap: latest.review?.predictionGap?.summary || "",
          winner: latest.winnerAnalysis
            ? {
                name: latest.winnerAnalysis.name,
                factors: (latest.winnerAnalysis.winFactors || []).map(
                  (f) => f.label
                ),
                explain: latest.winnerAnalysis.explain,
              }
            : null,
          losers: (latest.loserAnalysis?.items || []).slice(0, 3).map((l) => ({
            name: l.name,
            reasons: (l.reasons || []).map((r) => r.label),
            explain: l.explain,
          })),
          timestamp: latest.timestamp,
          explainSections: buildExplainFromRecord(latest),
        }
      : null,
    lessons: recentLessons,
    nextWatch,
    dangerFavorites,
    rising,
    falling,
    horseMemos: memoList,
    history,
    reviewHistory: reviews.slice(0, 15).map((r) => ({
      id: r.id,
      raceId: r.raceId,
      summary: r.review?.overview?.summary || "",
      timestamp: r.timestamp,
      tone: r.review?.overview?.tone || "",
    })),
  };
}

function buildExplainFromRecord(record) {
  const sections = [];
  const r = record.review || {};
  const add = (title, conclusion, why) => {
    if (conclusion) sections.push({ title, conclusion, why: why || "" });
  };
  add("レース総括", r.overview?.summary, r.overview?.explain);
  add("展開", r.development?.summary, r.development?.explain);
  add("ペース", r.pace?.summary, r.pace?.explain);
  add("馬場", r.track?.summary, r.track?.explain);
  add("人気", r.popularity?.summary, r.popularity?.explain);
  add("市場心理", r.marketPsych?.summary, r.marketPsych?.explain);
  add("予想差異", r.predictionGap?.summary, r.predictionGap?.explain);
  if (record.winnerAnalysis) {
    add(
      "勝ち馬",
      record.winnerAnalysis.name,
      record.winnerAnalysis.explain
    );
  }
  return sections.slice(0, 10);
}

export function resetReviewKnowledge() {
  clearKnowledgeBase();
  try {
    localStorage.removeItem(REVIEW_DEMO_FLAG);
  } catch {
    /* ignore */
  }
  return getReviewDashboard({ ensureDemo: true });
}

/**
 * history.json からレビューを再生成（デモ／手動更新用）
 */
export async function reviewFromHistoryRecord(histRecord) {
  if (!histRecord) return null;
  const race = histRecord.race || {};
  const entries = (histRecord.results || []).map((r) => ({
    number: r.number,
    finish: r.finish,
    popularity: r.popularity,
    name: r.name || `馬${r.number}`,
    payout: r.payout,
  }));
  return runRaceReview({
    race: {
      ...race,
      id: histRecord.id,
      date: histRecord.date,
    },
    raceId: histRecord.id,
    entries,
    prediction: histRecord.prediction || {},
    learningDiff: histRecord.learning || null,
    persist: true,
    timestamp: histRecord.date
      ? new Date(histRecord.date.replace(" ", "T") + "+09:00").toISOString()
      : undefined,
  });
}

export async function bootstrapReviewsFromHistory() {
  try {
    const data = await loadJson("history");
    const records = Array.isArray(data?.records) ? data.records : [];
    const out = [];
    for (const rec of records.slice(0, 5)) {
      out.push(await reviewFromHistoryRecord(rec));
    }
    return out;
  } catch {
    return [];
  }
}
