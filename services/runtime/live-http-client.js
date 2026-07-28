/* ========================================
   Live HTTP Client — Ver10.8
   公開API / GitHub Pages / GitHub Raw のみ（プロキシ禁止）
   ETag / Last-Modified / TTL 対応
   ======================================== */

import {
  LIVE_HTTP_TIMEOUT_MS,
  DATA_CACHE_TTL_MS,
} from "../../js/config.js";
import {
  getHttpCacheEntry,
  setHttpCacheEntry,
  isHttpCacheFresh,
} from "./http-cache.js";
import { recordConnection } from "./connection-telemetry.js";

export const LIVE_HTTP_CLIENT_VERSION = "10.8.0";

/**
 * 直接 fetch のみ。CORS プロキシ・jina・独自サーバーは使わない。
 */
export async function liveFetch(url, options = {}) {
  const sourceUrl = String(url || "");
  if (!sourceUrl) {
    throw classifyError("FETCH_URL_EMPTY", "URLが空です", { url: sourceUrl });
  }

  const timeoutMs =
    Number(options.timeoutMs) || LIVE_HTTP_TIMEOUT_MS || 20000;
  const ttlMs = Number(options.ttlMs) || DATA_CACHE_TTL_MS || 600000;
  const force = options.force === true;
  const accept = options.accept || "*/*";
  const domain = options.domain || "unknown";
  const providerId = options.providerId || null;
  const started = performance.now();

  const cached = getHttpCacheEntry(sourceUrl);
  if (!force && isHttpCacheFresh(cached, ttlMs) && cached?.body != null) {
    const result = {
      ok: true,
      status: cached.status || 200,
      text: cached.body,
      json: cached.json,
      url: sourceUrl,
      requestUrl: sourceUrl,
      via: "cache",
      latencyMs: Math.round(performance.now() - started),
      contentType: cached.contentType,
      size: cached.size || byteSize(cached.body),
      etag: cached.etag,
      lastModified: cached.lastModified,
      fromCache: true,
      cacheStatus: "HIT",
    };
    if (options.record !== false) {
      recordConnection({
        domain,
        providerId,
        url: sourceUrl,
        httpStatus: result.status,
        ok: true,
        fetchCount: options.countFromJson
          ? countPayload(result.json)
          : 1,
        parserCount: 0,
        parserOk: true,
        parserNote: "cache hit",
        latencyMs: result.latencyMs,
        downloadSize: result.size,
        cacheStatus: "HIT",
      });
    }
    return result;
  }

  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  let timer = null;
  if (controller) {
    timer = setTimeout(() => controller.abort(), timeoutMs);
  }

  const headers = { Accept: accept };
  if (!force && cached?.etag) headers["If-None-Match"] = cached.etag;
  if (!force && cached?.lastModified) {
    headers["If-Modified-Since"] = cached.lastModified;
  }

  try {
    const res = await fetch(sourceUrl, {
      cache: force ? "no-store" : "default",
      signal: controller?.signal,
      headers,
    });

    if (res.status === 304 && cached?.body != null) {
      const refreshed = setHttpCacheEntry(sourceUrl, {
        ...cached,
        fetchedAt: new Date().toISOString(),
        ttlMs,
      });
      return {
        ok: true,
        status: 304,
        text: refreshed.body,
        json: refreshed.json,
        url: sourceUrl,
        requestUrl: sourceUrl,
        via: "cache-revalidated",
        latencyMs: Math.round(performance.now() - started),
        contentType: refreshed.contentType,
        size: refreshed.size,
        etag: refreshed.etag,
        lastModified: refreshed.lastModified,
        fromCache: true,
        cacheStatus: "REVALIDATED",
      };
    }

    const text = await res.text();
    const size = byteSize(text);
    let json = null;
    const ct = res.headers.get("content-type") || "";
    if (/json/i.test(ct) || /^\s*[\[{]/.test(text)) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }

    if (!res.ok) {
      throw classifyError(
        res.status === 404
          ? "HTTP_404"
          : res.status === 403
            ? "HTTP_403"
            : "FETCH_HTTP",
        `HTTP ${res.status}`,
        { status: res.status, url: sourceUrl }
      );
    }

    const etag = res.headers.get("etag");
    const lastModified = res.headers.get("last-modified");
    setHttpCacheEntry(sourceUrl, {
      etag,
      lastModified,
      body: text,
      json,
      status: res.status,
      fetchedAt: new Date().toISOString(),
      ttlMs,
      size,
      contentType: ct,
    });

    return {
      ok: true,
      status: res.status,
      text,
      json,
      url: sourceUrl,
      requestUrl: sourceUrl,
      via: "direct",
      latencyMs: Math.round(performance.now() - started),
      contentType: ct || null,
      size,
      etag,
      lastModified,
      fromCache: false,
      cacheStatus: "MISS",
    };
  } catch (err) {
    if (err?.code) throw err;
    const aborted = err?.name === "AbortError";
    const msg = String(err?.message || err || "");
    let code = "FETCH_ERROR";
    let reason = msg || "取得失敗";
    if (aborted) {
      code = "TIMEOUT";
      reason = `Timeout (${timeoutMs}ms)`;
    } else if (/Failed to fetch|NetworkError|CORS|cross-origin/i.test(msg)) {
      code = "CORS";
      reason = "CORS";
    }
    throw classifyError(code, reason, {
      status: err?.status || null,
      url: sourceUrl,
      cause: err,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function liveFetchJson(url, options = {}) {
  const result = await liveFetch(url, {
    ...options,
    accept: options.accept || "application/json",
  });
  if (result.json == null) {
    try {
      result.json = JSON.parse(result.text);
    } catch {
      throw classifyError("PARSER_ERROR", "Parser Error (JSON)", {
        status: result.status,
        url: result.url,
      });
    }
  }
  return result;
}

export async function liveFetchText(url, options = {}) {
  return liveFetch(url, {
    ...options,
    accept: options.accept || "text/plain,application/xml,text/xml,*/*",
  });
}

function classifyError(code, message, extra = {}) {
  return Object.assign(new Error(message || "現在データを取得できません"), {
    code,
    reason: message,
    userMessage: formatUserError(code, message),
    ...extra,
  });
}

export function formatUserError(code, detail = "") {
  const map = {
    HTTP_404: "404",
    HTTP_403: "403",
    CORS: "CORS",
    TIMEOUT: "Timeout",
    PARSER_ERROR: "Parser Error",
    VALIDATION_ERROR: "Validation Error",
    FETCH_HTTP: detail || "HTTP Error",
    FETCH_ERROR: detail || "取得失敗",
  };
  const label = map[code] || detail || code || "取得失敗";
  return `現在データを取得できません（${label}）`;
}

function byteSize(text = "") {
  try {
    return new TextEncoder().encode(String(text)).length;
  } catch {
    return String(text).length;
  }
}

function countPayload(json) {
  if (!json || typeof json !== "object") return 0;
  if (Array.isArray(json.races)) return json.races.length;
  if (Array.isArray(json.entries)) return json.entries.length;
  if (Array.isArray(json.odds)) return json.odds.length;
  if (Array.isArray(json.items)) return json.items.length;
  if (json.weather) return 1;
  return 1;
}

export const LiveHttpClient = {
  fetch: liveFetch,
  fetchJson: liveFetchJson,
  fetchText: liveFetchText,
  formatUserError,
  version: LIVE_HTTP_CLIENT_VERSION,
};
