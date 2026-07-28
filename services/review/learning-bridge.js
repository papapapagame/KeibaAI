/* ========================================
   Learning Bridge — Ver6.5
   Review → Learning AI へ引き渡し可能な構造
   （評価ロジックは変更しない）
   ======================================== */

import { REVIEW_VERSION } from "./knowledge-manager.js";

/**
 * Learning AI Engine が受け取れるペイロードを生成。
 * services/learning の ingest / learnFromResult を直接書き換えない。
 */
export function buildLearningHandoff(bundle) {
  const race = bundle?.race || {};
  const entries = bundle?.entries || [];
  const finishOrder = [...entries]
    .sort((a, b) => Number(a.finish) - Number(b.finish))
    .map((e) => Number(e.number))
    .filter((n) => Number.isFinite(n));

  return {
    handoffVersion: REVIEW_VERSION,
    type: "race_review_learning_handoff",
    policy: {
      autoRewriteForbidden: true,
      aiEngineUntouched: true,
      thinkingEngineUntouched: true,
    },
    race: {
      id: bundle?.raceId || race.id || null,
      venueLabel: race.venueLabel || "",
      number: race.number || null,
      name: race.name || "",
      track: race.track || "",
      distance: race.distance || null,
      trackCondition: race.trackCondition || "",
    },
    result: {
      finishOrder,
      winnerNumber: finishOrder[0] ?? null,
      entries: entries.map((e) => ({
        number: e.number,
        finish: e.finish,
        popularity: e.popularity,
        name: e.name || e.horse,
      })),
    },
    reviewSummary: {
      overview: bundle?.raceFlow?.overview?.summary || "",
      predictionGap: bundle?.raceFlow?.predictionGap?.summary || "",
      lessons: (bundle?.lessons?.items || []).map((l) => l.text),
      winner: bundle?.winnerAnalysis
        ? {
            horseId: bundle.winnerAnalysis.horseId,
            name: bundle.winnerAnalysis.name,
            factors: (bundle.winnerAnalysis.winFactors || []).map((f) => f.label),
          }
        : null,
      losers: (bundle?.loserAnalysis?.items || []).map((l) => ({
        horseId: l.horseId,
        name: l.name,
        reasons: (l.reasons || []).map((r) => r.code),
      })),
    },
    futureWatch: {
      nextWatch: (bundle?.futureWatch?.nextWatch || []).map(slimWatch),
      dangerFavorites: (bundle?.futureWatch?.dangerFavorites || []).map(
        slimWatch
      ),
    },
    explain: (bundle?.explainReview?.sections || []).slice(0, 12),
    timestamp: new Date().toISOString(),
  };
}

function slimWatch(w) {
  return {
    horseId: w.horseId,
    number: w.number,
    name: w.name,
    score: w.score,
    reason: w.reason,
  };
}

/**
 * Learning Dashboard へ渡すための軽い参照情報
 */
export function toLearningCompatibleNotes(handoff) {
  if (!handoff) return [];
  const notes = [];
  for (const text of handoff.reviewSummary?.lessons || []) {
    notes.push({ source: "review", text });
  }
  if (handoff.reviewSummary?.predictionGap) {
    notes.push({
      source: "review",
      text: handoff.reviewSummary.predictionGap,
    });
  }
  return notes;
}
