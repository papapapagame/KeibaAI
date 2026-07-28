/* ========================================
   WeatherNormalizer — Ver10.3
   ======================================== */

import { createWeather, createTrack } from "../../models/unified.js";
import { analyzeTrackCondition } from "../../weather/track-condition-manager.js";
import { parseTrackCondition } from "./track-condition-parser.js";

export const WEATHER_NORMALIZER_VERSION = "10.3.0";

export function normalizeRealWeather(acceptedItem, meta = {}, options = {}) {
  if (!acceptedItem) {
    return {
      item: null,
      weatherModel: null,
      trackModel: null,
      scores: null,
      fingerprint: "",
      version: WEATHER_NORMALIZER_VERSION,
    };
  }

  const track = parseTrackCondition(acceptedItem);
  const scores = analyzeTrackCondition(acceptedItem);

  const item = {
    ...acceptedItem,
    surface: track.surface || acceptedItem.surface || "芝",
    surfaceState: track.surfaceState || acceptedItem.surfaceState,
    turfCondition: track.turfCondition || acceptedItem.turfCondition,
    dirtCondition: track.dirtCondition || acceptedItem.dirtCondition,
    weatherScore: scores.weatherScore,
    trackScore: scores.trackScore,
    surfaceScore: scores.surfaceScore,
    scores,
    source: "real",
    providerId: options.providerId || meta.providerId || "real-weather",
    providerName:
      acceptedItem.providerName || meta.providerName || "Real Weather",
    raceDate: meta.raceDate || null,
    venueId: meta.venueId || null,
    raceNumber: meta.raceNumber ?? null,
    phase: meta.phase || "final",
  };

  const weatherModel = createWeather({
    weather: item.weather,
    temperature: item.temperature,
    humidity: item.humidity,
    windSpeed: item.windSpeed,
    windDirection: item.windDirection,
    precipitation: item.precipitation,
    precipitationAvailable: item.precipitationAvailable,
    updatedAt: item.updatedAt,
    providerName: item.providerName,
    weatherScore: item.weatherScore,
    source: "real",
  });

  const trackModel = createTrack({
    trackCondition: item.trackCondition,
    surface: item.surface,
    surfaceState: item.surfaceState,
    turfCondition: item.turfCondition,
    dirtCondition: item.dirtCondition,
    moisture: item.moisture,
    moistureAvailable: item.moistureAvailable,
    trackScore: item.trackScore,
    surfaceScore: item.surfaceScore,
    updatedAt: item.updatedAt,
    source: "real",
  });

  return {
    item,
    weatherModel,
    trackModel,
    scores,
    fingerprint: fingerprintWeatherItem(item),
    version: WEATHER_NORMALIZER_VERSION,
  };
}

export function fingerprintWeatherItem(item) {
  if (!item) return "";
  return [
    item.weather,
    item.trackCondition,
    item.windDirection,
    item.windSpeed,
    item.updatedAt,
    item.temperature,
    item.humidity,
    item.precipitation,
  ].join("|");
}

export const WeatherNormalizer = {
  normalize: normalizeRealWeather,
  fingerprint: fingerprintWeatherItem,
  version: WEATHER_NORMALIZER_VERSION,
};
