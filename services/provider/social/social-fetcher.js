/* ========================================
   SocialFetcher — Ver10.9
   Wikipedia pageviews（会場・馬別）+ HN
   失敗時: GitHub data/social/social.json
   ======================================== */

import { REAL_SOCIAL_FETCH_TIMEOUT_MS } from "../../../js/config.js";
import {
  liveFetchJson,
  formatUserError,
} from "../../runtime/live-http-client.js";
import { recordConnection } from "../../runtime/connection-telemetry.js";
import {
  adaptSocialPublicFeeds,
  buildWikipediaPageviewsUrl,
  buildWikipediaOpenSearchUrl,
  buildHnSearchUrl,
  ymdJst,
} from "../live/live-feed-adapters.js";
import { fetchDataJsonWithFallback } from "../live/data-url-resolver.js";
import { VENUE_COORDINATES } from "../live/netkeiba-utils.js";

export const SOCIAL_FETCHER_VERSION = "10.9.0";

const BASE_WIKI_TITLES = ["競馬", "中央競馬", "日本中央競馬会"];

export async function fetchSocialRawData(options = {}) {
  const timeoutMs =
    Number(options.timeoutMs) || REAL_SOCIAL_FETCH_TIMEOUT_MS || 20000;
  const started = performance.now();
  const end = ymdJst(0);
  const start = ymdJst(-7);
  const pageviews = [];
  let lastUrl = null;
  let lastStatus = null;
  let apiError = null;

  const venueId = String(options.venueId || options.venue || "").toLowerCase();
  const venueLabel =
    options.venueLabel || VENUE_COORDINATES[venueId]?.label || "";
  const venueTitles = venueLabel ? [`${venueLabel}競馬場`] : [];
  const topicTitles = [...BASE_WIKI_TITLES, ...venueTitles];

  for (const title of topicTitles) {
    try {
      const pv = await fetchPageviewsForTitle(title, start, end, timeoutMs, options);
      if (pv) {
        pageviews.push(pv);
        lastUrl = pv.url;
        lastStatus = 200;
      }
    } catch (err) {
      apiError = err;
    }
  }

  // 出走馬ごとの Wikipedia（最大8頭・低リスク公開API）
  const horseNames = [
    ...new Set(
      (options.horseNames || options.horses || [])
        .map((n) => String(n || "").trim())
        .filter((n) => n.length >= 2)
    ),
  ].slice(0, 8);

  for (const horse of horseNames) {
    try {
      const resolved = await resolveWikipediaTitle(horse, timeoutMs, options);
      if (!resolved) continue;
      const pv = await fetchPageviewsForTitle(
        resolved,
        start,
        end,
        timeoutMs,
        options
      );
      if (!pv) continue;
      pageviews.push({
        ...pv,
        horses: [horse],
        source: "wikipedia-horse",
      });
      lastUrl = pv.url;
      lastStatus = 200;
    } catch (err) {
      apiError = apiError || err;
    }
  }

  let hnHits = [];
  try {
    const hnQuery = venueLabel
      ? `keiba OR "${venueLabel}" horse racing`
      : "horse racing OR keiba";
    const hnUrl = buildHnSearchUrl(hnQuery);
    const hn = await liveFetchJson(hnUrl, {
      timeoutMs,
      force: options.force,
      record: false,
    });
    lastUrl = hn.url;
    lastStatus = hn.status;
    hnHits = Array.isArray(hn.json?.hits) ? hn.json.hits : [];
  } catch (err) {
    apiError = apiError || err;
  }

  if (pageviews.length || hnHits.length) {
    const raw = adaptSocialPublicFeeds({
      pageviews,
      hnHits,
      newsItems: [],
      options: {
        raceDate: options.date || options.raceDate || null,
        venueId: options.venueId || null,
        raceNumber: options.raceNumber,
      },
    });
    recordConnection({
      domain: "social",
      providerId: "real-social",
      url: lastUrl,
      httpStatus: lastStatus || 200,
      ok: true,
      fetchCount: raw.items.length,
      parserCount: raw.items.length,
      parserOk: true,
      parserNote: `wiki ${pageviews.length} (horses ${horseNames.length}) / hn ${hnHits.length}`,
      latencyMs: Math.round(performance.now() - started),
    });
    return {
      ok: true,
      raw,
      url: lastUrl,
      httpStatus: lastStatus || 200,
      fetchedAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - started),
      sourceKind: "wikipedia-hn-horse",
      version: SOCIAL_FETCHER_VERSION,
    };
  }

  try {
    const res = await fetchDataJsonWithFallback(
      "data/social/social.json",
      liveFetchJson,
      {
        timeoutMs,
        force: options.force,
        domain: "social",
        providerId: "real-social",
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
      domain: "social",
      providerId: "real-social",
      url: res.url,
      httpStatus: res.status,
      ok: true,
      fetchCount: count,
      parserCount: count,
      parserOk: true,
      parserNote: `GitHub social.json ${count} (API: ${apiError?.code || "empty"})`,
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
      sourceKind: "github-social-json",
      apiError: apiError
        ? { code: apiError.code, message: apiError.message }
        : null,
      version: SOCIAL_FETCHER_VERSION,
    };
  } catch (err) {
    const finalErr = apiError || err;
    recordConnection({
      domain: "social",
      providerId: "real-social",
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
        url: finalErr?.url,
        status: finalErr?.status,
        userMessage: formatUserError(finalErr?.code, finalErr?.message),
      }
    );
  }
}

async function resolveWikipediaTitle(query, timeoutMs, options = {}) {
  const url = buildWikipediaOpenSearchUrl(query);
  const res = await liveFetchJson(url, {
    timeoutMs: Math.min(timeoutMs, 8000),
    force: options.force,
    record: false,
  });
  // OpenSearch: [query, [titles], [descs], [urls]]
  const titles = Array.isArray(res.json?.[1]) ? res.json[1] : [];
  const hit = titles[0];
  if (!hit) return null;
  if (hit === query) return hit;
  // 「馬名（競走馬）」など公式括弧付きのみ許容（誤マッチ防止）
  if (
    hit.startsWith(`${query}（`) ||
    hit.startsWith(`${query}(`) ||
    hit.startsWith(`${query} `)
  ) {
    return hit;
  }
  return null;
}

async function fetchPageviewsForTitle(title, start, end, timeoutMs, options = {}) {
  const url = buildWikipediaPageviewsUrl(title, start, end);
  const res = await liveFetchJson(url, {
    timeoutMs: Math.min(timeoutMs, 10000),
    force: options.force,
    domain: "social",
    providerId: "real-social",
    record: false,
  });
  const items = res.json?.items || [];
  if (!items.length) return null;
  const last = items[items.length - 1];
  const prev = items.length > 1 ? items[items.length - 2] : null;
  const views = items.reduce((n, it) => n + (Number(it.views) || 0), 0);
  return {
    title,
    views: Number(last?.views) || views,
    prevViews: Number(prev?.views) || Math.floor(views / items.length),
    timestamp: last?.timestamp
      ? `${String(last.timestamp).slice(0, 4)}-${String(last.timestamp).slice(4, 6)}-${String(last.timestamp).slice(6, 8)}T00:00:00+09:00`
      : new Date().toISOString(),
    url: res.url,
  };
}

export const SocialFetcher = {
  fetch: fetchSocialRawData,
  version: SOCIAL_FETCHER_VERSION,
};
