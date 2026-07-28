/* ========================================
   Weather Repository — Ver7.9 / Ver10.3
   ======================================== */

import { API_BASE_URL } from "../../js/config.js";
import { getWeatherMode } from "./weather-mode.js";
import { loadRealWeather } from "../provider/weather/index.js";

export async function fetchWeatherRaw(options = {}) {
  const weatherMode = options.weatherMode || getWeatherMode();

  // Ver10.3 Real Weather（自動 Mock フォールバックなし）
  if (weatherMode === "real") {
    const real = await loadRealWeather({
      ...options,
      stage: options.stage,
      force: options.forceRefresh || options.force,
      silent: options.silent !== false,
      emitUpdate: options.emitUpdate === true,
    });
    if (!real.ok) {
      return {
        ok: false,
        blocked: false,
        message: real.userMessage || "天候情報を取得できませんでした",
        userMessage: "天候情報を取得できませんでした",
        providerId: real.providerId || "real-weather",
        mode: "real",
        item: null,
        phase: "none",
        validation: real.validation,
        error: real.error || null,
      };
    }
    return {
      ok: true,
      blocked: false,
      message: real.message || "Real Weather",
      providerId: real.providerId || "real-weather",
      providerName: real.providerName || "Real Weather",
      mode: "real",
      item: real.item || real.weather,
      phase: real.phase || "final",
      meta: {
        ...(real.meta || {}),
        updatedAt: real.updatedAt || real.fetchedAt,
        phase: real.phase || "final",
        skipped: real.skipped,
        changed: real.changed,
        fingerprint: real.fingerprint,
        updateCount: real.updateCount,
      },
      realBundle: real,
      validation: real.validation,
      scores: real.scores,
      weatherModel: real.weatherModel,
      trackModel: real.trackModel,
      provenance: { providerId: real.providerId, source: "real-weather" },
    };
  }

  try {
    const weatherJson = await fetchJsonOptional("weather/mock-weather.json");
    const racesJson = await fetchJsonOptional("races.json");
    const item =
      weatherJson?.weather ||
      raceToWeatherItem(racesJson?.races?.[0] || racesJson || {});

    return {
      ok: true,
      blocked: false,
      message: "Mock Weather Repository",
      providerId: "mock",
      providerName: "Mock Weather",
      mode: "mock",
      item,
      phase: weatherJson?.phase || "final",
      meta: {
        raceDate: options.date || weatherJson?.raceDate || null,
        venueId: options.venueId || weatherJson?.venueId || null,
        raceNumber: options.raceNumber || weatherJson?.raceNumber || null,
        updatedAt: weatherJson?.updatedAt || item?.updatedAt || new Date().toISOString(),
        phase: weatherJson?.phase || "final",
      },
    };
  } catch (err) {
    return {
      ok: false,
      blocked: false,
      message: err?.message || "Weather fetch failed",
      userMessage: "天候情報を取得できませんでした",
      providerId: "mock",
      mode: "mock",
      item: null,
      phase: "none",
    };
  }
}

function raceToWeatherItem(race = {}) {
  return {
    weather: race.weather || null,
    temperature: race.temperature ?? null,
    humidity: race.humidity ?? null,
    windSpeed: race.windSpeed ?? null,
    windDirection: race.windDirection || null,
    trackCondition: race.trackCondition || race.condition || null,
    surface: race.track || race.surface || null,
    surfaceState: race.surfaceState || null,
    moisture: race.moisture ?? null,
    moistureAvailable: race.moisture != null,
    precipitation: race.precipitation ?? null,
    precipitationAvailable: race.precipitation != null,
    updatedAt: race.weatherUpdatedAt || null,
    providerName: "Mock Weather",
    history: Array.isArray(race.weatherHistory) ? race.weatherHistory : [],
  };
}

async function fetchJsonOptional(path) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const WeatherRepository = { fetch: fetchWeatherRaw };
