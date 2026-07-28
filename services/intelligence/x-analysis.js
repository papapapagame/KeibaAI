/* ========================================
   PAPAPA IQ KEIBA - X Analysis Foundation
   Ver5.1 AI Intelligence Platform
   取得情報は表示しない。AI解析専用。
   ======================================== */

/**
 * 将来の X 検索クエリ設計（実行しない）
 * @param {{ raceName?: string, horseNames?: string[], jockeyNames?: string[], trainerNames?: string[] }} ctx
 */
export function buildXSearchQueries(ctx = {}) {
  const raceName = ctx.raceName || "";
  const horses = Array.isArray(ctx.horseNames) ? ctx.horseNames : [];
  const jockeys = Array.isArray(ctx.jockeyNames) ? ctx.jockeyNames : [];
  const trainers = Array.isArray(ctx.trainerNames) ? ctx.trainerNames : [];

  const queries = [];

  if (raceName) {
    queries.push(raceName);
    queries.push(`#${raceName.replace(/\s+/g, "")}`);
  }

  for (const name of horses) {
    if (name) queries.push(name);
  }
  for (const name of jockeys) {
    if (name) queries.push(name);
  }
  for (const name of trainers) {
    if (name) queries.push(name);
  }

  // 定型キーワード
  queries.push("本命", "穴馬", "危険馬");

  return {
    queries: [...new Set(queries.filter(Boolean))],
    // AI入力専用フラグ — UI へ渡さないこと
    aiOnly: true,
    // TODO: Implement X API search execution
    status: "READY",
  };
}

/**
 * X 生投稿 → AI入力用シグナル（将来実装）
 * 画面表示用に整形しない。
 */
export function prepareXSignalsForAi(_posts = []) {
  // TODO: Implement X API post → sentiment / buzz signals
  return {
    signals: [],
    aiOnly: true,
    note: "X analysis foundation only — no live fetch",
  };
}
