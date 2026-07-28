/* ========================================
   WeatherFetcher — Ver10.8
   Open-Meteo 公開 API（直接・CORS対応）
   ======================================== */

import { REAL_WEATHER_FETCH_TIMEOUT_MS } from "../../../js/config.js";
import { liveFetchJson, formatUserError } from "../../runtime/live-http-client.js";
import { recordConnection } from "../../runtime/connection-telemetry.js";
import {
  adaptOpenMeteoWeather,
  buildOpenMeteoUrl,
} from "../live/live-feed-adapters.js";
import { getRealRaceState } from "../race/race-calendar-synchronizer.js";

export const WEATHER_FETCHER_VERSION = "10.8.0";

export async function fetchWeatherRawData(options = {}) {
  const timeoutMs =
    Number(options.timeoutMs) || REAL_WEATHER_FETCH_TIMEOUT_MS || 15000;
  const started = performance.now();
  const venueId = String(options.venueId || options.venue || "tokyo").toLowerCase();
  const url = buildOpenMeteoUrl(venueId);
  const trackHint = findTrackHint(options);

  try {
    const res = await liveFetchJson(url, {
      timeoutMs,
      force: options.force,
      domain: "weather",
      providerId: "real-weather",
      record: false,
    });
    const raw = adaptOpenMeteoWeather(res.json, {
      venueId,
      raceDate: options.date || options.raceDate || null,
      raceNumber: options.raceNumber,
      surface: options.surface || trackHint.surface || "芝",
      trackCondition: trackHint.trackCondition || null,
      phase: options.phase || "final",
    });

    recordConnection({
      domain: "weather",
      providerId: "real-weather",
      url: res.url,
      httpStatus: res.status,
      ok: true,
      fetchCount: 1,
      parserCount: 1,
      parserOk: true,
      parserNote: `${raw.weather?.weather || "—"} / ${raw.weather?.trackCondition || "—"}`,
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
      version: WEATHER_FETCHER_VERSION,
    };
  } catch (err) {
    recordConnection({
      domain: "weather",
      providerId: "real-weather",
      url: err?.url || url,
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
        url: err?.url || url,
        status: err?.status,
        userMessage: formatUserError(err?.code, err?.message),
      }
    );
  }
}

function findTrackHint(options = {}) {
  const state = getRealRaceState();
  const races = state?.legacyRaces || state?.races || [];
  const venueId = String(options.venueId || options.venue || "").toLowerCase();
  const date = options.date || options.raceDate || "";
  const number = Number(options.raceNumber) || 0;
  const hit =
    races.find(
      (r) =>
        (!date || r.date === date) &&
        (!venueId || r.venueId === venueId || r.venue === venueId) &&
        (!number || Number(r.number) === number)
    ) ||
    races.find((r) => !venueId || r.venueId === venueId || r.venue === venueId);
  return {
    trackCondition: hit?.trackCondition || "",
    surface: hit?.surface || hit?.track || "",
  };
}

export const WeatherFetcher = {
  fetch: fetchWeatherRawData,
  version: WEATHER_FETCHER_VERSION,
};
