/* ========================================
   Conflict Resolver — Ver8.2
   矛盾時: 信頼度・更新時刻・重要度・取得率で採用決定
   ======================================== */

/**
 * Detect conflicts by claimType (+ subject) and resolve winners.
 * Not a simple average — weighted comparison of evidence quality.
 */
export function resolveConflicts(evidence = []) {
  const groups = new Map();
  for (const e of evidence || []) {
    if (!e.available) continue;
    const key = groupKey(e);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }

  const conflicts = [];
  const adoptedIds = new Set();
  const excludedIds = new Set();
  const resolutions = [];

  for (const [key, group] of groups) {
    if (group.length < 2) {
      group.forEach((e) => adoptedIds.add(e.id));
      continue;
    }

    const conflicted = detectGroupConflict(group);
    if (!conflicted) {
      // agree — adopt all (or top)
      group.forEach((e) => adoptedIds.add(e.id));
      continue;
    }

    const ranked = [...group].sort(
      (a, b) => resolutionScore(b) - resolutionScore(a)
    );
    const winner = ranked[0];
    const losers = ranked.slice(1);

    adoptedIds.add(winner.id);
    losers.forEach((l) => excludedIds.add(l.id));

    const reason = buildResolveReason(winner, losers);
    const conflict = {
      id: `cf_${key.replace(/\|/g, "_")}`,
      claimType: winner.claimType,
      subject: winner.subject,
      members: group.map((g) => ({
        id: g.id,
        source: g.source,
        sourceLabel: g.sourceLabel,
        claim: g.claim,
        value: g.value,
        polarity: g.polarity,
        scores: g.scores,
        resolutionScore: resolutionScore(g),
      })),
      adoptedId: winner.id,
      excludedIds: losers.map((l) => l.id),
      reason,
      severity: conflictSeverity(group),
    };
    conflicts.push(conflict);
    resolutions.push({
      conflictId: conflict.id,
      adoptedId: winner.id,
      excludedIds: losers.map((l) => l.id),
      reason,
    });
  }

  // evidence not in any conflict group already handled; ensure singles adopted
  for (const e of evidence || []) {
    if (!e.available) {
      excludedIds.add(e.id);
      continue;
    }
    if (!excludedIds.has(e.id)) adoptedIds.add(e.id);
  }

  return {
    conflicts,
    resolutions,
    adoptedIds: [...adoptedIds],
    excludedIds: [...excludedIds].filter((id) => !adoptedIds.has(id)),
  };
}

/** 横断比較用キー（人気×バズ、取消信号など） */
function groupKey(e) {
  if (e.claimType === "scratch_signal") return "scratch_signal|scratch";
  if (
    e.claimType === "favorite_signal" ||
    (e.claimType === "buzz_signal" && e.subject === "horse")
  ) {
    return "horse_attention|horse";
  }
  if (
    e.claimType === "track_condition" ||
    (e.claimType === "weather" && e.subject === "track")
  ) {
    return "track_condition|track";
  }
  return `${e.claimType}|${e.subject || ""}`;
}

function detectGroupConflict(group) {
  // Different polarities on same claim type
  const pols = new Set(group.map((g) => g.polarity).filter(Boolean));
  if (pols.has("positive") && pols.has("negative")) return true;

  // Distinct string values (e.g. track condition)
  const strVals = group
    .map((g) => g.value)
    .filter((v) => typeof v === "string" && v);
  if (new Set(strVals).size > 1) return true;

  // Favorite / buzz horse disagreement
  if (
    group[0].claimType === "favorite_signal" ||
    group[0].claimType === "buzz_signal" ||
    group[0].subject === "horse"
  ) {
    const names = new Set(
      group.flatMap((g) => g.horseNames || []).filter(Boolean)
    );
    if (names.size > 1 && group.length >= 2) {
      // only conflict if different named horses with opposing or competing signals
      const byHorse = group.filter((g) => (g.horseNames || []).length);
      if (byHorse.length >= 2) {
        const first = (byHorse[0].horseNames || [])[0];
        return byHorse.some((g) => (g.horseNames || [])[0] !== first);
      }
    }
  }

  // Scratch count mismatch between sources
  if (group[0].claimType === "scratch_signal") {
    const nums = group.map((g) => Number(g.value)).filter((n) => Number.isFinite(n));
    if (nums.length >= 2 && Math.max(...nums) - Math.min(...nums) >= 1) {
      return true;
    }
  }

  return false;
}

/**
 * Weighted resolution score — NOT a plain average of values.
 * reliability + freshness + importance + coverage (+ source base)
 */
export function resolutionScore(e) {
  const s = e.scores || {};
  const updatedBoost = e.updatedAt ? freshnessBoost(e.updatedAt) : 0;
  return (
    (Number(s.reliability) || 0) * 0.35 +
    (Number(s.freshness) || 0) * 0.2 +
    (Number(s.importance) || 0) * 0.25 +
    (Number(s.coverage) || 0) * 0.15 +
    (Number(e.weightBase) || 0.5) * 100 * 0.05 +
    updatedBoost
  );
}

function freshnessBoost(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  const hours = (Date.now() - t) / 3600000;
  if (hours <= 2) return 8;
  if (hours <= 12) return 4;
  return 0;
}

function buildResolveReason(winner, losers) {
  const parts = [
    `採用: ${winner.sourceLabel}（信頼度${winner.scores?.reliability ?? "—"} / 重要度${winner.scores?.importance ?? "—"} / 鮮度${winner.scores?.freshness ?? "—"} / 取得率${winner.scores?.coverage ?? "—"}）`,
  ];
  for (const l of losers.slice(0, 3)) {
    parts.push(
      `除外: ${l.sourceLabel}（解決スコア ${Math.round(resolutionScore(l))} < ${Math.round(resolutionScore(winner))}）`
    );
  }
  return parts.join(" / ");
}

function conflictSeverity(group) {
  const hasScratch = group.some((g) => g.claimType === "scratch_signal");
  const hasOpp =
    group.some((g) => g.polarity === "positive") &&
    group.some((g) => g.polarity === "negative");
  if (hasScratch && hasOpp) return "high";
  if (hasOpp) return "medium";
  return "low";
}

export const ConflictResolver = {
  resolve: resolveConflicts,
  score: resolutionScore,
};
