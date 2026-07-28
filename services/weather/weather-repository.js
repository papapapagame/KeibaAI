/* ========================================
   Weather Repository — Ver7.9
   ======================================== */

import { acquireBundle } from "../provider/index.js";
import { getSourceMode } from "../data/source-mode.js";
import { API_BASE_URL } from "../../js/config.js";

export async function fetchWeatherRaw(options = {}) {
  const mode = options.mode || getSourceMode();

  if (mode === "real") {
    const acquired = await acquireBundle({ ...options, mode: "real" });
    if (!acquired.ok) {
      return {
        ok: false,
        blocked: true,
        message: acquired.message || "Provider未接続",
        providerId: acquired.providerId || "real",
        mode,
        item: null,
        phase: "none",
      };
    }
    const race = acquired.raw?.race || acquired.data?.race || {};
    return {
      ok: true,
      blocked: false,
      message: "Real Weather via Framework",
      providerId: acquired.providerId,
      mode,
      item: raceToWeatherItem(race),
      phase: "final",
      provenance: acquired.provenance,
      framework: acquired.framework,
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
      mode,
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
      providerId: "mock",
      mode,
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
    updatedAt: race.weatherUpdatedAt || null,
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
