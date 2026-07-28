/* ========================================
   X Search Plan (AI-only, no post storage/display)
   Ver5.4
   ======================================== */

/**
 * 将来の X 検索候補のみ生成。投稿本文は扱わない。
 */
export function buildXSearchPlan(context = {}) {
  const race = context.race || {};
  const horses = Array.isArray(context.horses) ? context.horses : [];
  const raceName = race.name || "";
  const queries = [];

  if (raceName) {
    queries.push(raceName);
    queries.push(`#${String(raceName).replace(/\s+/g, "")}`);
  }
  for (const h of horses) {
    const name = h.name || h.horse;
    if (name) queries.push(name);
    if (h.jockey) queries.push(h.jockey);
    if (h.trainer) queries.push(h.trainer);
  }
  queries.push("#本命", "#穴馬", "#危険馬");

  return {
    // TODO: Implement X API fetch — never store/display raw posts
    status: "READY",
    implemented: false,
    queries: [...new Set(queries.filter(Boolean))],
    aiOnly: true,
    storePosts: false,
    displayPosts: false,
  };
}

/**
 * 投稿メタ（件数のみ）→ シグナル。本文フィールドは受け取っても破棄。
 */
export function summarizeXMetrics(raw = {}) {
  // 意図的に text / body / content を無視
  const postCount = Number(raw.postCount) || 0;
  const supportRate = Number(raw.supportRate);
  const denyRate = Number(raw.denyRate);
  const rising = Array.isArray(raw.risingWords)
    ? raw.risingWords.map((w) => String(w)).slice(0, 8)
    : [];

  return {
    postCount,
    supportRate: Number.isFinite(supportRate) ? supportRate : null,
    denyRate: Number.isFinite(denyRate) ? denyRate : null,
    buzzIndex: Number(raw.buzzIndex) || Math.min(100, postCount),
    risingWords: rising,
    aiOnly: true,
  };
}
