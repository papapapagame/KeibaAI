/* ========================================
   Prediction Diff — Ver8.3
   前回分析との比較（sessionStorage）
   ======================================== */

const DIFF_KEY = "papapa_iq_explain_snapshot_v83";

export function loadPreviousSnapshot() {
  try {
    const raw = sessionStorage.getItem(DIFF_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSnapshot(snapshot) {
  try {
    sessionStorage.setItem(DIFF_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

export function buildSnapshot(context = {}) {
  const ranked = context.ranked || [];
  const discussion = context.discussion || null;
  const adoptedIds = (discussion?.reasoning?.adopted || []).map((e) => e.id);
  const excludedIds = (discussion?.reasoning?.excluded || []).map((e) => e.id);
  return {
    at: new Date().toISOString(),
    raceKey: context.raceKey || "",
    stage: Number(context.stage) || 0,
    confidence: context.confidence ?? null,
    ranking: ranked.slice(0, 12).map((h, idx) => ({
      rank: idx + 1,
      number: h.number,
      horse: h.horse || h.horseName || "",
      score: h.thinking?.score ?? h.indexes?.total ?? null,
    })),
    adoptedIds,
    excludedIds,
    consensusScore: discussion?.consensus?.consensusScore ?? null,
    conflictScore: discussion?.consensus?.conflictScore ?? null,
  };
}

/**
 * Compare current vs previous snapshot for same raceKey when possible.
 */
export function buildPredictionDiff(current = null, previous = null) {
  if (!current) {
    return {
      available: false,
      rankChanges: [],
      confidenceDelta: null,
      newEvidence: [],
      removedEvidence: [],
      highlights: ["前回分析がありません（初回または別レース）。"],
    };
  }
  if (!previous || (previous.raceKey && current.raceKey && previous.raceKey !== current.raceKey)) {
    return {
      available: false,
      rankChanges: [],
      confidenceDelta: null,
      newEvidence: [],
      removedEvidence: [],
      highlights: ["比較可能な前回スナップショットがありません。"],
    };
  }

  const prevRank = new Map(
    (previous.ranking || []).map((r) => [Number(r.number), r])
  );
  const rankChanges = (current.ranking || [])
    .map((r) => {
      const p = prevRank.get(Number(r.number));
      if (!p) {
        return {
          number: r.number,
          horse: r.horse,
          from: null,
          to: r.rank,
          delta: null,
          text: `${r.horse || r.number}番: 新規順位 ${r.rank}位`,
        };
      }
      const delta = p.rank - r.rank; // positive = improved
      if (delta === 0) return null;
      return {
        number: r.number,
        horse: r.horse,
        from: p.rank,
        to: r.rank,
        delta,
        text: `${r.horse || r.number}番: ${p.rank}位 → ${r.rank}位（${delta > 0 ? "+" : ""}${delta}）`,
      };
    })
    .filter(Boolean);

  const prevAdopted = new Set(previous.adoptedIds || []);
  const currAdopted = new Set(current.adoptedIds || []);
  const newEvidence = [...currAdopted].filter((id) => !prevAdopted.has(id));
  const removedEvidence = [...prevAdopted].filter((id) => !currAdopted.has(id));

  const confidenceDelta =
    current.confidence != null && previous.confidence != null
      ? Math.round(Number(current.confidence) - Number(previous.confidence))
      : null;

  const highlights = [];
  if (confidenceDelta != null && confidenceDelta !== 0) {
    highlights.push(
      `Confidence ${previous.confidence}% → ${current.confidence}%（${confidenceDelta > 0 ? "+" : ""}${confidenceDelta}）`
    );
  }
  if (rankChanges.length) {
    highlights.push(`順位変動 ${rankChanges.length}件`);
  }
  if (newEvidence.length) {
    highlights.push(`新規採用 Evidence ${newEvidence.length}件`);
  }
  if (removedEvidence.length) {
    highlights.push(`除外へ転じた Evidence ${removedEvidence.length}件`);
  }
  if (current.stage !== previous.stage) {
    highlights.push(`Stage ${previous.stage} → ${current.stage}`);
  }
  if (!highlights.length) {
    highlights.push("前回から大きな変更はありません。");
  }

  return {
    available: true,
    previousAt: previous.at || null,
    rankChanges,
    confidenceDelta,
    confidenceFrom: previous.confidence ?? null,
    confidenceTo: current.confidence ?? null,
    newEvidence,
    removedEvidence,
    stageFrom: previous.stage,
    stageTo: current.stage,
    highlights,
  };
}

export const PredictionDiffStore = {
  load: loadPreviousSnapshot,
  save: saveSnapshot,
  snapshot: buildSnapshot,
  diff: buildPredictionDiff,
};
