/* ========================================
   Weather History Manager — Ver7.9
   ======================================== */

const HISTORY_KEY = "papapa_iq_weather_history_v79";
const MAX_HISTORY = 120;

export function recordWeatherChange(type, detail = {}, note = "") {
  const entry = {
    id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    type,
    detail,
    note: note || "",
  };
  const list = loadWeatherHistory();
  list.unshift(entry);
  if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
  saveWeatherHistory(list);
  return entry;
}

export function loadWeatherHistory() {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWeatherHistory(list) {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function diffWeather(prev, next) {
  const changes = [];
  if (!prev && next) {
    changes.push({ type: "weather_added", to: next });
    return changes;
  }
  if (!prev || !next) return changes;

  if (String(prev.weather) !== String(next.weather)) {
    changes.push({
      type: "weather_change",
      from: prev.weather,
      to: next.weather,
    });
  }
  if (String(prev.trackCondition) !== String(next.trackCondition)) {
    changes.push({
      type: "track_change",
      from: prev.trackCondition,
      to: next.trackCondition,
    });
  }
  if (Number(prev.windSpeed) !== Number(next.windSpeed)) {
    changes.push({
      type: "wind_speed_change",
      from: prev.windSpeed,
      to: next.windSpeed,
    });
  }
  if (String(prev.windDirection || "") !== String(next.windDirection || "")) {
    changes.push({
      type: "wind_direction_change",
      from: prev.windDirection,
      to: next.windDirection,
    });
  }
  if (
    prev.moisture != null &&
    next.moisture != null &&
    Number(prev.moisture) !== Number(next.moisture)
  ) {
    changes.push({
      type: "moisture_updated",
      from: prev.moisture,
      to: next.moisture,
    });
  }
  return changes;
}

export const WeatherHistoryManager = {
  record: recordWeatherChange,
  load: loadWeatherHistory,
  diff: diffWeather,
};
