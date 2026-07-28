/* ========================================
   NewsFetcher — Ver10.8
   1) Google News RSS（直接）
   2) CORS失敗時: GitHub data/news/news.json（Real・Mockではない）
   ======================================== */

import {
  REAL_NEWS_URL,
  REAL_NEWS_FETCH_TIMEOUT_MS,
} from "../../../js/config.js";
import {
  liveFetchText,
  liveFetchJson,
  formatUserError,
} from "../../runtime/live-http-client.js";
import { recordConnection } from "../../runtime/connection-telemetry.js";
import { parseGoogleNewsRss } from "../live/live-feed-adapters.js";
import { fetchDataJsonWithFallback } from "../live/data-url-resolver.js";

export const NEWS_FETCHER_VERSION = "10.8.0";

export async function fetchNewsRawData(options = {}) {
  const timeoutMs =
    Number(options.timeoutMs) || REAL_NEWS_FETCH_TIMEOUT_MS || 15000;
  const started = performance.now();
  const rssUrl = options.url || REAL_NEWS_URL;
  let rssError = null;

  // 1) Google News RSS（CORS 対応ブラウザのみ成功）
  try {
    const res = await liveFetchText(rssUrl, {
      timeoutMs,
      force: options.force,
      domain: "news",
      providerId: "real-news",
      record: false,
    });
    const raw = parseGoogleNewsRss(res.text, {
      raceDate: options.date || options.raceDate || null,
      venueId: options.venueId || null,
      raceNumber: options.raceNumber,
    });
    if (raw.items?.length) {
      recordConnection({
        domain: "news",
        providerId: "real-news",
        url: res.url,
        httpStatus: res.status,
        ok: true,
        fetchCount: raw.items.length,
        parserCount: raw.items.length,
        parserOk: true,
        parserNote: `RSS ${raw.items.length}`,
        latencyMs: Math.round(performance.now() - started),
        downloadSize: res.size,
        cacheStatus: res.cacheStatus,
      });
      return {
        ok: true,
        raw,
        url: res.url,
        httpStatus: res.status,
        fetchedAt: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - started),
        size: res.size,
        cacheStatus: res.cacheStatus,
        sourceKind: "google-news-rss",
        version: NEWS_FETCHER_VERSION,
      };
    }
    rssError = Object.assign(new Error("Parser Error"), {
      code: "PARSER_ERROR",
      status: res.status,
      url: res.url,
    });
  } catch (err) {
    rssError = err;
  }

  // 2) GitHub Pages / Raw の実ニュースメタデータ（MockProviderではない）
  try {
    const res = await fetchDataJsonWithFallback(
      "data/news/news.json",
      liveFetchJson,
      {
        timeoutMs,
        force: options.force,
        domain: "news",
        providerId: "real-news",
        record: false,
      }
    );
    const raw = res.json;
    const count = Array.isArray(raw?.items) ? raw.items.length : 0;
    if (!count) {
      throw Object.assign(new Error("Parser Error"), {
        code: "PARSER_ERROR",
        status: res.status,
        url: res.url,
      });
    }
    recordConnection({
      domain: "news",
      providerId: "real-news",
      url: res.url,
      httpStatus: res.status,
      ok: true,
      fetchCount: count,
      parserCount: count,
      parserOk: true,
      parserNote: `GitHub news.json ${count} (RSS: ${rssError?.code || rssError?.message || "empty"})`,
      latencyMs: Math.round(performance.now() - started),
      downloadSize: res.size,
      cacheStatus: res.cacheStatus,
      error: rssError
        ? `RSS ${rssError.code || rssError.message}`
        : null,
    });
    return {
      ok: true,
      raw,
      url: res.url,
      httpStatus: res.status,
      fetchedAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - started),
      size: res.size,
      cacheStatus: res.cacheStatus,
      sourceKind: "github-news-json",
      rssError: rssError
        ? {
            code: rssError.code,
            message: rssError.message,
            reason: rssError.reason || rssError.message,
          }
        : null,
      version: NEWS_FETCHER_VERSION,
    };
  } catch (err) {
    const finalErr = rssError || err;
    recordConnection({
      domain: "news",
      providerId: "real-news",
      url: finalErr?.url || rssUrl,
      httpStatus: finalErr?.status || null,
      ok: false,
      fetchCount: 0,
      parserCount: 0,
      parserOk: false,
      error: formatUserError(finalErr?.code, finalErr?.message),
      latencyMs: Math.round(performance.now() - started),
    });
    throw Object.assign(
      new Error(formatUserError(finalErr?.code, finalErr?.message)),
      {
        code: finalErr?.code || "FETCH_ERROR",
        cause: finalErr,
        url: finalErr?.url || rssUrl,
        status: finalErr?.status,
        userMessage: formatUserError(finalErr?.code, finalErr?.message),
      }
    );
  }
}

export const NewsFetcher = {
  fetch: fetchNewsRawData,
  version: NEWS_FETCHER_VERSION,
};
