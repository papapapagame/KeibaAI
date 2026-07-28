/* ========================================
   Weather Validator — Ver7.9
   ======================================== */

const WEATHER_SET = new Set([
  "晴",
  "曇",
  "小雨",
  "雨",
  "雪",
  "霧",
  "晴れ",
  "くもり",
]);
const TRACK_SET = new Set(["良", "稍重", "重", "不良"]);
const SURFACE_SET = new Set(["芝", "ダート", "ダ", "turf", "dirt"]);

/**
 * 異常値・欠損・型・更新時刻
 * 失敗データは AI へ渡さない
 */
export function validateWeather(raw = {}) {
  const errors = [];
  const warnings = [];

  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      errors: [{ code: "TYPE", message: "Weather データ型異常" }],
      warnings: [],
      sanitized: null,
    };
  }

  const weather = String(raw.weather || "").trim();
  const trackCondition = String(raw.trackCondition || raw.condition || "").trim();
  const surface = normalizeSurface(raw.surface || raw.track);
  const updatedAt = raw.updatedAt || null;

  if (!weather) {
    errors.push({ code: "MISSING", message: "天候欠損" });
  } else if (!WEATHER_SET.has(weather) && weather !== "未確定") {
    warnings.push({ code: "RANGE", message: `天候未知ラベル: ${weather}` });
  }

  if (!trackCondition) {
    errors.push({ code: "MISSING", message: "馬場状態欠損" });
  } else if (!TRACK_SET.has(trackCondition) && trackCondition !== "未確定") {
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
  }

  const windSpeed = raw.windSpeed != null ? Number(raw.windSpeed) : null;
  if (windSpeed != null) {
    if (!Number.isFinite(windSpeed) || windSpeed < 0 || windSpeed > 40) {
      errors.push({ code: "RANGE", message: `風速異常値: ${raw.windSpeed}` });
    }
  } else {
    warnings.push({ code: "MISSING", message: "風速欠損" });
  }

  const windDirection = raw.windDirection
    ? String(raw.windDirection).trim()
    : null;

  let moisture = raw.moisture != null ? Number(raw.moisture) : null;
  const moistureAvailable = Boolean(
    raw.moistureAvailable || (moisture != null && Number.isFinite(moisture))
  );
  if (moistureAvailable) {
    if (!Number.isFinite(moisture) || moisture < 0 || moisture > 100) {
      errors.push({ code: "RANGE", message: `含水率異常値: ${raw.moisture}` });
      moisture = null;
    }
  } else {
    moisture = null;
  }

  if (!updatedAt) {
    warnings.push({ code: "MISSING", message: "更新時刻欠損" });
  } else if (Number.isNaN(Date.parse(updatedAt))) {
    errors.push({ code: "TYPE", message: "更新時刻型異常" });
  }

  let precipitation =
    raw.precipitation != null ? Number(raw.precipitation) : null;
  const precipitationAvailable = Boolean(
    raw.precipitationAvailable ||
      (precipitation != null && Number.isFinite(precipitation))
  );
  if (precipitationAvailable) {
    if (
      !Number.isFinite(precipitation) ||
      precipitation < 0 ||
      precipitation > 300
    ) {
      errors.push({
        code: "RANGE",
        message: `降水量異常値: ${raw.precipitation}`,
      });
      precipitation = null;
    }
  } else {
    precipitation = null;
  }

  if (errors.length) {
    return { ok: false, errors, warnings, sanitized: null };
  }

  const sanitized = {
    weather,
    temperature: Number.isFinite(temperature) ? temperature : null,
    humidity: Number.isFinite(humidity) ? humidity : null,
    windSpeed: Number.isFinite(windSpeed) ? windSpeed : null,
    windDirection,
    trackCondition,
    surface: surface || "芝",
    surfaceState: raw.surfaceState || deriveSurfaceState(trackCondition),
    turfCondition: raw.turfCondition || null,
    dirtCondition: raw.dirtCondition || null,
    moisture,
    moistureAvailable,
    precipitation,
    precipitationAvailable:
      precipitationAvailable && precipitation != null,
    weatherScore: raw.weatherScore != null ? Number(raw.weatherScore) : null,
    trackScore: raw.trackScore != null ? Number(raw.trackScore) : null,
    surfaceScore: raw.surfaceScore != null ? Number(raw.surfaceScore) : null,
    updatedAt: updatedAt || new Date().toISOString(),
    providerName: raw.providerName || null,
    history: Array.isArray(raw.history) ? raw.history : [],
    weatherConfirmed: true,
    trackConfirmed: true,
  };

  return { ok: true, errors, warnings, sanitized };
}

function normalizeSurface(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (s === "ダ" || s.toLowerCase() === "dirt") return "ダート";
  if (s.toLowerCase() === "turf") return "芝";
  if (SURFACE_SET.has(s)) return s === "ダ" ? "ダート" : s;
  return s;
}

function deriveSurfaceState(trackCondition) {
  if (trackCondition === "良") return "標準";
  if (trackCondition === "稍重") return "やや重い";
  if (trackCondition === "重" || trackCondition === "不良") return "重い";
  return "標準";
}

export const WeatherValidator = { validate: validateWeather };
