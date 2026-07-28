/* ========================================
   PAPAPA IQ KEIBA - Local Feed Loader
   Ver5.2 Real Intelligence Connect
   GitHub Pages 同一オリジン JSON 取得
   ======================================== */

import { API_BASE_URL } from "../../js/config.js";

/**
 * @param {string} relativePath e.g. "race.json" or "intelligence/news-feed.json"
 */
export async function fetchLocalJson(relativePath) {
  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`;
  const url = `${base}${relativePath.replace(/^\//, "")}`;
  const started = performance.now();
  const response = await fetch(url, { cache: "no-store" });
  const ms = Math.round(performance.now() - started);
  if (!response.ok) {
    const err = new Error(`Local feed failed: ${url} (${response.status})`);
    err.responseMs = ms;
    throw err;
  }
  const data = await response.json();
  return { data, url, responseMs: ms };
}

/**
 * 複数フィードを並列取得。失敗は null で返す（必須でないフィード用）
 */
export async function fetchLocalJsonOptional(relativePath) {
  try {
    return await fetchLocalJson(relativePath);
  } catch (err) {
    return {
      data: null,
      url: relativePath,
      responseMs: err?.responseMs || 0,
      error: err?.message || String(err),
    };
  }
}
