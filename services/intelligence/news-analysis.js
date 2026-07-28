/* ========================================
   PAPAPA IQ KEIBA - News Analysis Foundation
   Ver5.1 AI Intelligence Platform
   表示ではなく AI 入力専用。
   ======================================== */

/**
 * 将来解析対象カテゴリ
 */
export const NEWS_CATEGORIES = ["競馬ニュース", "コラム", "速報"];

/**
 * ニュース記事を AI 入力パケットへ変換（将来実装）
 * @param {any[]} articles
 */
export function prepareNewsForAi(articles = []) {
  // TODO: Implement News Parser
  const list = Array.isArray(articles) ? articles : [];
  return {
    packets: list.map((a) => ({
      id: a.id || "",
      category: a.category || "競馬ニュース",
      title: a.title || "",
      body: a.body || "",
      publishedAt: a.publishedAt || null,
      source: a.source || "news",
      aiOnly: true,
    })),
    aiOnly: true,
    note: "News analysis foundation only — no live fetch / no UI render",
  };
}

/**
 * カテゴリ別の取得計画（実行しない）
 */
export function buildNewsFetchPlan() {
  return {
    categories: [...NEWS_CATEGORIES],
    // TODO: Implement News Parser feed URLs
    status: "READY",
    aiOnly: true,
  };
}
