/* ========================================
   WeatherParser — Ver10.3
   ======================================== */

export const WEATHER_PARSER_VERSION = "10.3.0";

export function parseWeatherRaw(raw = {}, providerId = "real-weather") {
  if (!raw || typeof raw !== "object") {
    return {
      providerId,
      item: null,
      meta: {},
      parsedAt: new Date().toISOString(),
      version: WEATHER_PARSER_VERSION,
      empty: true,
    };
  }

  const src =
    raw.weather && typeof raw.weather === "object" && !Array.isArray(raw.weather)
      ? raw.weather
      : raw;

  const item = {
    weather: src.weather || null,
    temperature: src.temperature != null ? Number(src.temperature) : null,
    humidity: src.humidity != null ? Number(src.humidity) : null,
    windSpeed: src.windSpeed != null ? Number(src.windSpeed) : null,
    windDirection: src.windDirection || null,
    trackCondition: src.trackCondition || src.condition || null,
    surface: src.surface || src.track || null,
    surfaceState: src.surfaceState || null,
    turfCondition: src.turfCondition || null,
    dirtCondition: src.dirtCondition || null,
    moisture: src.moisture != null ? Number(src.moisture) : null,
    moistureAvailable:
      src.moistureAvailable === true ||
      (src.moisture != null && Number.isFinite(Number(src.moisture))),
    precipitation:
      src.precipitation != null ? Number(src.precipitation) : null,
    precipitationAvailable:
      src.precipitationAvailable === true ||
      (src.precipitation != null &&
        Number.isFinite(Number(src.precipitation))),
    updatedAt: src.updatedAt || raw.updatedAt || null,
    fetchedAt: raw.fetchedAt || null,
    providerName: src.providerName || raw.providerName || providerId,
    history: Array.isArray(src.history) ? src.history : [],
  };

  return {
    providerId,
    item,
    meta: {
      raceDate: raw.raceDate || raw.date || null,
      venueId: raw.venueId || raw.venue || null,
      raceNumber: raw.raceNumber != null ? Number(raw.raceNumber) : null,
      phase: raw.phase || "final",
      updatedAt: raw.updatedAt || item.updatedAt || null,
      fetchedAt: raw.fetchedAt || null,
      source: raw.source || "real",
      providerName: raw.providerName || providerId,
    },
    parsedAt: new Date().toISOString(),
    version: WEATHER_PARSER_VERSION,
    empty: false,
  };
}

export const WeatherParser = {
  parse: parseWeatherRaw,
  version: WEATHER_PARSER_VERSION,
};
