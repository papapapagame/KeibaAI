/* ========================================
   Real Data URL Resolver — GitHub Pages / Raw
   ======================================== */

import {
  API_BASE_URL,
  GITHUB_RAW_BASE_URL,
  REAL_DATA_BASE_URL,
  PREFER_GITHUB_RAW,
} from "../../../js/config.js";

export const DATA_URL_RESOLVER_VERSION = "10.8.0";

/**
 * /data 配下のパスを解決する。
 * 1) REAL_DATA_BASE_URL（明示）
 * 2) PREFER_GITHUB_RAW → raw.githubusercontent.com
 * 3) 同一オリジン相対 path（GitHub Pages）
 */
export function resolveDataUrl(relativePath = "") {
  const path = String(relativePath || "").replace(/^\//, "");
  const base = String(REAL_DATA_BASE_URL || "").replace(/\/?$/, "/");
  if (base && /^https?:\/\//i.test(base)) {
    return `${base}${path}`;
  }
  if (PREFER_GITHUB_RAW && GITHUB_RAW_BASE_URL) {
    return `${String(GITHUB_RAW_BASE_URL).replace(/\/?$/, "/")}${path}`;
  }
  const localBase = String(API_BASE_URL || "data/").replace(/\/?$/, "/");
  // path already includes "data/..." or just "calendar/..."
  if (path.startsWith("data/")) return path;
  if (localBase.endsWith("data/") || localBase === "data/") {
    return `${localBase}${path.replace(/^data\//, "")}`;
  }
  return `${localBase}${path}`;
}

export function dataUrlsFor(relativePath = "") {
  const path = String(relativePath || "").replace(/^\//, "");
  const normalized = path.startsWith("data/") ? path : `data/${path}`;
  const pages = normalized;
  const raw = `${String(GITHUB_RAW_BASE_URL || "").replace(/\/?$/, "/")}${normalized}`;
  const primary = resolveDataUrl(normalized);
  return { primary, pages, raw, path: normalized };
}

/**
 * Pages 相対 → 失敗時 Raw の順で試す（どちらも GitHub 公開データ）
 */
export async function fetchDataJsonWithFallback(relativePath, fetchJson, options = {}) {
  const urls = dataUrlsFor(relativePath);
  const tried = [];
  let lastErr = null;

  const candidates = PREFER_GITHUB_RAW
    ? [urls.raw, urls.pages]
    : [urls.primary, urls.raw].filter(
        (u, i, arr) => u && arr.indexOf(u) === i
      );

  for (const url of candidates) {
    tried.push(url);
    try {
      const res = await fetchJson(url, options);
      return { ...res, tried, selectedUrl: url };
    } catch (err) {
      lastErr = err;
    }
  }

  throw Object.assign(
    lastErr || new Error("現在データを取得できません"),
    { tried, url: tried[tried.length - 1] || null }
  );
}

export const DataUrlResolver = {
  resolve: resolveDataUrl,
  urlsFor: dataUrlsFor,
  fetchWithFallback: fetchDataJsonWithFallback,
  version: DATA_URL_RESOLVER_VERSION,
};
