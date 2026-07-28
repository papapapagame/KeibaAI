/* ========================================
   HorseEntryFetcher — Ver10.8
   GitHub /data/horse/entries.json
   ======================================== */

import { REAL_HORSE_FETCH_TIMEOUT_MS } from "../../../js/config.js";
import { liveFetchJson, formatUserError } from "../../runtime/live-http-client.js";
import { recordConnection } from "../../runtime/connection-telemetry.js";
import { fetchDataJsonWithFallback } from "../live/data-url-resolver.js";

export const HORSE_ENTRY_FETCHER_VERSION = "10.8.0";

export async function fetchHorseEntryRaw(options = {}) {
  const timeoutMs =
    Number(options.timeoutMs) || REAL_HORSE_FETCH_TIMEOUT_MS || 15000;
  const started = performance.now();

  try {
    const res = await fetchDataJsonWithFallback(
      "data/horse/entries.json",
      liveFetchJson,
      {
        timeoutMs,
        force: options.force,
        domain: "horse",
        providerId: "real-horse",
        record: false,
      }
    );
    const raw = res.json;
    const count = Array.isArray(raw?.entries)
      ? raw.entries.length
      : Array.isArray(raw?.horses)
        ? raw.horses.length
        : 0;
    if (!count) {
      throw Object.assign(new Error("Parser Error"), {
        code: "PARSER_ERROR",
        status: res.status,
        url: res.url,
      });
    }

    recordConnection({
      domain: "horse",
      providerId: "real-horse",
      url: res.url,
      httpStatus: res.status,
      ok: true,
      fetchCount: count,
      parserCount: count,
      parserOk: true,
      parserNote: `entries ${count}`,
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
      version: HORSE_ENTRY_FETCHER_VERSION,
    };
  } catch (err) {
    recordConnection({
      domain: "horse",
      providerId: "real-horse",
      url: err?.url || null,
      httpStatus: err?.status || null,
      ok: false,
      fetchCount: 0,
      parserCount: 0,
      parserOk: false,
      error: formatUserError(err?.code, err?.message),
      latencyMs: Math.round(performance.now() - started),
    });
    throw Object.assign(
      new Error(formatUserError(err?.code, err?.message)),
      {
        code: err?.code || "FETCH_ERROR",
        cause: err,
        url: err?.url,
        status: err?.status,
        userMessage: formatUserError(err?.code, err?.message),
      }
    );
  }
}

export const HorseEntryFetcher = {
  fetch: fetchHorseEntryRaw,
  version: HORSE_ENTRY_FETCHER_VERSION,
};
