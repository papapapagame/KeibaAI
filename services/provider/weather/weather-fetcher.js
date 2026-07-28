/* ========================================
   WeatherFetcher — Ver10.9
   Open-Meteo JMA → Forecast フォールバック（CORS対応）
   ======================================== */

import { REAL_WEATHER_FETCH_TIMEOUT_MS } from "../../../js/config.js";
import { liveFetchJson, formatUserError } from "../../runtime/live-http-client.js";
import { recordConnection } from "../../runtime/connection-telemetry.js";
import {
  adaptOpenMeteoWeather,
  buildOpenMeteoUrl,
} from "../live/live-feed-adapters.js";
import { getRealRaceState } from "../race/race-calendar-synchronizer.js";

export const WEATHER_FETCHER_VERSION = "10.9.0";

export async function fetchWeatherRawData(options = {}) {
  const timeoutMs =
    Number(options.timeoutMs) || REAL_WEATHER_FETCH_TIMEOUT_MS || 15000;
  const started = performance.now();
  const venueId = String(options.venueId || options.venue || "tokyo").toLowerCase();
  const trackHint = findTrackHint(options);
  let lastErr = null;

  const attempts = [
    { useForecast: false, model: "jma", label: "Open-Meteo JMA" },
    { useForecast: true, model: "forecast", label: "Open-Meteo Forecast" },
  ];

  for (const attempt of attempts) {
    const url = buildOpenMeteoUrl(venueId, { useForecast: attempt.useForecast });
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
        model: attempt.model,
        providerName: `Real Weather (${attempt.label})`,
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
        parserNote: `${attempt.model} ${raw.weather?.weather || "—"} / ${raw.weather?.trackCondition || "—"} / moist ${raw.weather?.moisture ?? "—"}`,
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
        sourceKind: attempt.model,
        version: WEATHER_FETCHER_VERSION,
      };
    } catch (err) {
      lastErr = err;
    }
  }

  const url = buildOpenMeteoUrl(venueId, { useForecast: false });
  recordConnection({
    domain: "weather",
    providerId: "real-weather",
    url: lastErr?.url || url,
    httpStatus: lastErr?.status || null,
    ok: false,
    fetchCount: 0,
    parserCount: 0,
    parserOk: false,
    error: formatUserError(lastErr?.code, lastErr?.message),
    latencyMs: Math.round(performance.now() - started),
  });
  throw Object.assign(
    new Error(formatUserError(lastErr?.code, lastErr?.message)),
    {
      code: lastErr?.code || "FETCH_ERROR",
      cause: lastErr,
      url: lastErr?.url || url,
      status: lastErr?.status,
      userMessage: formatUserError(lastErr?.code, lastErr?.message),
    }
  );
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
