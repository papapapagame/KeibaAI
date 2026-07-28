/* ========================================
   PAPAPA IQ KEIBA - Data Validator
   Ver5.2 Real Intelligence Connect
   不足 / 欠損 / 異常値 / 重複 の自動検出
   ======================================== */

const REQUIRED_BY_TYPE = {
  race: ["date", "venueLabel", "number", "name", "distance", "track", "time"],
  horse: ["number", "name", "jockey", "odds", "popularity"],
  odds: ["horseNumber", "win"],
  history: ["horseNumber", "finish"],
  news: ["title"],
};

/**
 * @param {any[]} items collector / provider items
 * @returns {{ ok: boolean, issues: object[], summary: object }}
 */
export function validateIntelligenceItems(items = []) {
  const list = Array.isArray(items) ? items : [];
  const issues = [];
  const seen = new Map();

  for (let i = 0; i < list.length; i += 1) {
    const item = list[i] || {};
    const type = String(item.type || "unknown");
    const required = REQUIRED_BY_TYPE[type] || [];

    for (const field of required) {
      const value = item[field];
      if (value == null || value === "") {
        issues.push({
          level: "missing",
          index: i,
          type,
          field,
          message: `${type}.${field} is missing`,
        });
      }
    }

    // 異常値
    if (type === "horse" || type === "odds") {
      const odds = Number(item.odds != null ? item.odds : item.win);
      if (Number.isFinite(odds) && (odds <= 1 || odds > 9999)) {
        issues.push({
          level: "anomaly",
          index: i,
          type,
          field: "odds",
          message: `abnormal odds: ${odds}`,
        });
      }
      const pop = Number(item.popularity);
      if (Number.isFinite(pop) && (pop < 1 || pop > 18)) {
        issues.push({
          level: "anomaly",
          index: i,
          type,
          field: "popularity",
          message: `abnormal popularity: ${pop}`,
        });
      }
    }

    if (type === "race") {
      const dist = Number(item.distance);
      if (Number.isFinite(dist) && (dist < 800 || dist > 4000)) {
        issues.push({
          level: "anomaly",
          index: i,
          type,
          field: "distance",
          message: `abnormal distance: ${dist}`,
        });
      }
    }

    if (type === "history") {
      const finish = Number(item.finish);
      if (Number.isFinite(finish) && (finish < 1 || finish > 18)) {
        issues.push({
          level: "anomaly",
          index: i,
          type,
          field: "finish",
          message: `abnormal finish: ${finish}`,
        });
      }
    }

    // 重複キー
    const key = buildDedupKey(item);
    if (key) {
      if (seen.has(key)) {
        issues.push({
          level: "duplicate",
          index: i,
          type,
          field: "key",
          message: `duplicate of index ${seen.get(key)} (${key})`,
        });
      } else {
        seen.set(key, i);
      }
    }
  }

  const summary = {
    total: list.length,
    missing: issues.filter((x) => x.level === "missing").length,
    anomaly: issues.filter((x) => x.level === "anomaly").length,
    duplicate: issues.filter((x) => x.level === "duplicate").length,
    issueCount: issues.length,
  };

  return {
    ok: summary.issueCount === 0,
    issues,
    summary,
  };
}

function buildDedupKey(item) {
  const type = item.type || "unknown";
  if (type === "horse") return `horse:${item.source || ""}:${item.number}`;
  if (type === "race") {
    return `race:${item.source || ""}:${item.date}:${item.venue}:${item.number}`;
  }
  if (type === "odds") return `odds:${item.source || ""}:${item.raceId}:${item.horseNumber}`;
  if (type === "history") {
    return `history:${item.source || ""}:${item.horseNumber}:${item.venue}:${item.distance}:${item.finish}:${item.time}`;
  }
  if (type === "news") return `news:${item.source || ""}:${item.id || item.title}`;
  return null;
}
