/* ========================================
   WeatherValidator — Ver10.3（Provider 層）
   ======================================== */

import { parseTrackCondition } from "./track-condition-parser.js";

export const WEATHER_PROVIDER_VALIDATOR_VERSION = "10.3.0";

const WEATHER_SET = new Set([
  "晴",
  "曇",
  "小雨",
  "雨",
  "雪",
  "霧",
  "晴れ",
  "くもり",
  "未確定",
]);
const TRACK_SET = new Set(["良", "稍重", "重", "不良", "未確定"]);

export function validateRealWeather(parsed = {}) {
  const errors = [];
  const warnings = [];
  const raw = parsed.item;
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      errors: [{ code: "EMPTY", message: "天候データが空です" }],
      warnings: [],
      acceptedItem: null,
      version: WEATHER_PROVIDER_VALIDATOR_VERSION,
    };
  }

  const weather = String(raw.weather || "").trim();
  const track = parseTrackCondition(raw);
  const trackCondition = track.trackCondition;
  const updatedAt = raw.updatedAt || parsed.meta?.updatedAt || null;

  if (!weather) {
    errors.push({ code: "REQUIRED", message: "天候必須欠損" });
  } else if (!WEATHER_SET.has(weather)) {
    warnings.push({ code: "RANGE", message: `天候未知ラベル: ${weather}` });
  }

  if (!trackCondition) {
    errors.push({ code: "REQUIRED", message: "馬場状態必須欠損" });
  } else if (!TRACK_SET.has(trackCondition)) {
    warnings.push({
      code: "RANGE",
      message: `馬場状態未知ラベル: ${trackCondition}`,
    });
  }

  const temperature =
    raw.temperature != null ? Number(raw.temperature) : null;
  if (temperature != null) {
    if (!Number.isFinite(temperature) || temperature < -10 || temperature > 45) {
      errors.push({ code: "RANGE", message: `気温異常値: ${raw.temperature}` });
    }
  } else {
    warnings.push({ code: "MISSING", message: "気温欠損" });
  }

  const humidity = raw.humidity != null ? Number(raw.humidity) : null;
  if (humidity != null) {
    if (!Number.isFinite(humidity) || humidity < 0 || humidity > 100) {
      errors.push({ code: "RANGE", message: `湿度異常値: ${raw.humidity}` });
    }
  } else {
    warnings.push({ code: "MISSING", message: "湿度欠損" });
  }

  const windSpeed = raw.windSpeed != null ? Number(raw.windSpeed) : null;
  if (windSpeed != null) {
    if (!Number.isFinite(windSpeed) || windSpeed < 0 || windSpeed > 40) {
      errors.push({ code: "RANGE", message: `風速異常値: ${raw.windSpeed}` });
    }
  } else {
    warnings.push({ code: "MISSING", message: "風速欠損" });
  }

  let precipitation =
    raw.precipitation != null ? Number(raw.precipitation) : null;
  const precipitationAvailable = Boolean(
    raw.precipitationAvailable ||
      (precipitation != null && Number.isFinite(precipitation))
  );
  if (precipitationAvailable) {
    if (!Number.isFinite(precipitation) || precipitation < 0 || precipitation > 300) {
      errors.push({
        code: "RANGE",
        message: `降水量異常値: ${raw.precipitation}`,
      });
      precipitation = null;
    }
  } else {
    precipitation = null;
  }

  if (!updatedAt) {
    warnings.push({ code: "UPDATED_AT", message: "更新時刻欠損" });
  } else if (Number.isNaN(Date.parse(updatedAt))) {
    errors.push({ code: "TYPE", message: "更新時刻型異常" });
  }

  if (errors.length) {
    return {
      ok: false,
      errors,
      warnings,
      acceptedItem: null,
      version: WEATHER_PROVIDER_VALIDATOR_VERSION,
    };
  }

  return {
    ok: true,
    errors,
    warnings,
    acceptedItem: {
      weather,
      temperature: Number.isFinite(temperature) ? temperature : null,
      humidity: Number.isFinite(humidity) ? humidity : null,
      windSpeed: Number.isFinite(windSpeed) ? windSpeed : null,
      windDirection: raw.windDirection ? String(raw.windDirection).trim() : null,
      trackCondition,
      surface: track.surface || "芝",
      surfaceState: track.surfaceState,
      turfCondition: track.turfCondition,
      dirtCondition: track.dirtCondition,
      moisture: track.moisture,
      moistureAvailable: track.moistureAvailable,
      precipitation,
      precipitationAvailable:
        precipitationAvailable && precipitation != null,
      updatedAt: updatedAt || new Date().toISOString(),
      fetchedAt: raw.fetchedAt || parsed.meta?.fetchedAt || null,
      providerName:
        raw.providerName || parsed.meta?.providerName || parsed.providerId,
      history: Array.isArray(raw.history) ? raw.history : [],
      weatherConfirmed: true,
      trackConfirmed: true,
    },
    version: WEATHER_PROVIDER_VALIDATOR_VERSION,
  };
}

export const WeatherValidator = {
  validate: validateRealWeather,
  version: WEATHER_PROVIDER_VALIDATOR_VERSION,
};
