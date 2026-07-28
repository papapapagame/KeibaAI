/* ========================================
   RaceCalendarFetcher — Ver10.8
   GitHub Pages / Raw の calendar JSON
   ======================================== */

import { REAL_RACE_FETCH_TIMEOUT_MS } from "../../../js/config.js";
import { liveFetchJson, formatUserError } from "../../runtime/live-http-client.js";
import { recordConnection } from "../../runtime/connection-telemetry.js";
import { fetchDataJsonWithFallback } from "../live/data-url-resolver.js";

export const RACE_CALENDAR_FETCHER_VERSION = "10.8.0";

export async function fetchRaceCalendarRaw(options = {}) {
  const timeoutMs =
    Number(options.timeoutMs) || REAL_RACE_FETCH_TIMEOUT_MS || 15000;
  const started = performance.now();

  try {
    const res = await fetchDataJsonWithFallback(
      "data/calendar/calendar.json",
      liveFetchJson,
      {
        timeoutMs,
        force: options.force,
        domain: "race",
        providerId: "real-race",
        record: false,
      }
    );

    const raw = res.json;
    const count = Array.isArray(raw?.races) ? raw.races.length : 0;
    if (!count && !(raw?.meetings || []).length) {
      throw Object.assign(new Error("Parser Error"), {
        code: "PARSER_ERROR",
        status: res.status,
        url: res.url,
      });
    }

    recordConnection({
      domain: "race",
      providerId: "real-race",
      url: res.url,
      httpStatus: res.status,
      ok: true,
      fetchCount: count,
      parserCount: count,
      parserOk: true,
      parserNote: `meetings ${(raw.meetings || []).length} / races ${count}`,
      latencyMs: Math.round(performance.now() - started),
      downloadSize: res.size,
      cacheStatus: res.cacheStatus,
    });

    return {
      ok: true,
      raw,
      url: res.url,
      requestUrl: res.requestUrl,
      httpStatus: res.status,
      fetchedAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - started),
      size: res.size,
      cacheStatus: res.cacheStatus,
      etag: res.etag,
      lastModified: res.lastModified,
      version: RACE_CALENDAR_FETCHER_VERSION,
    };
  } catch (err) {
    recordConnection({
      domain: "race",
      providerId: "real-race",
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

export const RaceCalendarFetcher = {
  fetch: fetchRaceCalendarRaw,
  version: RACE_CALENDAR_FETCHER_VERSION,
};
