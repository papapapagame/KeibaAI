/* ========================================
   NewsFetcher — Ver10.9
   レース横断 Google News RSS（+ YouTube言及）
   CORS失敗時: GitHub data/news/news.json
   ======================================== */

import { REAL_NEWS_FETCH_TIMEOUT_MS } from "../../../js/config.js";
import {
  liveFetchText,
  liveFetchJson,
  formatUserError,
} from "../../runtime/live-http-client.js";
import { recordConnection } from "../../runtime/connection-telemetry.js";
import {
  parseGoogleNewsRss,
  buildGoogleNewsRssUrl,
} from "../live/live-feed-adapters.js";
import {
  attachMatchedNames,
  buildRaceNewsQueries,
} from "../live/name-matcher.js";
import { fetchDataJsonWithFallback } from "../live/data-url-resolver.js";
import { VENUE_COORDINATES } from "../live/netkeiba-utils.js";

export const NEWS_FETCHER_VERSION = "10.9.0";

export async function fetchNewsRawData(options = {}) {
  const timeoutMs =
    Number(options.timeoutMs) || REAL_NEWS_FETCH_TIMEOUT_MS || 15000;
  const started = performance.now();
  const venueId = String(options.venueId || options.venue || "").toLowerCase();
  const venueLabel =
    options.venueLabel ||
    VENUE_COORDINATES[venueId]?.label ||
    venueId ||
    "";
  const queries = buildRaceNewsQueries({
    ...options,
    venueLabel,
    venueId,
  });
  let rssError = null;
  const mergedItems = [];
  const seen = new Set();
  let lastUrl = null;
  let lastStatus = null;

  for (const query of queries) {
    const rssUrl = buildGoogleNewsRssUrl(query);
    try {
      const res = await liveFetchText(rssUrl, {
        timeoutMs,
        force: options.force,
        domain: "news",
        providerId: "real-news",
        record: false,
      });
      lastUrl = res.url;
      lastStatus = res.status;
      const parsed = parseGoogleNewsRss(res.text, {
        raceDate: options.date || options.raceDate || null,
        venueId: options.venueId || null,
        raceNumber: options.raceNumber,
      });
      for (const item of parsed.items || []) {
        const key = String(item.title || "").trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        mergedItems.push({
          ...item,
          query,
          source:
            /site:youtube\.com/i.test(query) || /youtube/i.test(item.source || "")
              ? "youtube-via-news"
              : item.source,
        });
      }
    } catch (err) {
      rssError = err;
    }
  }

  if (mergedItems.length) {
    const attached = attachMatchedNames(mergedItems, options);
    const raw = {
      version: NEWS_FETCHER_VERSION,
      source: "real-live",
      providerId: "real-news",
      providerName: "Real News (Google News + YouTube meta)",
      updatedAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      raceDate: options.date || options.raceDate || null,
      venueId: options.venueId || null,
      raceNumber: options.raceNumber != null ? Number(options.raceNumber) : null,
      note: "Metadata only. No article/video body.",
      queries,
      items: attached.slice(0, 40),
    };
    recordConnection({
      domain: "news",
      providerId: "real-news",
      url: lastUrl,
      httpStatus: lastStatus || 200,
      ok: true,
      fetchCount: raw.items.length,
      parserCount: raw.items.length,
      parserOk: true,
      parserNote: `RSS queries ${queries.length} → ${raw.items.length}`,
      latencyMs: Math.round(performance.now() - started),
    });
    return {
      ok: true,
      raw,
      url: lastUrl,
      httpStatus: lastStatus || 200,
      fetchedAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - started),
      sourceKind: "google-news-rss-scoped",
      version: NEWS_FETCHER_VERSION,
    };
  }

  // GitHub fallback（Real JSON）
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
    const base = res.json || {};
    const items = attachMatchedNames(base.items || [], options);
    const count = items.length;
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
      error: rssError ? `RSS ${rssError.code || rssError.message}` : null,
    });
    return {
      ok: true,
      raw: { ...base, items },
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
      url: finalErr?.url || lastUrl,
      httpStatus: finalErr?.status || lastStatus,
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
        url: finalErr?.url || lastUrl,
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
