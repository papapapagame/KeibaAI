/* ========================================
   Weather Synchronizer — Ver7.9
   ======================================== */

import { emitEvent } from "../update/event-watcher.js";
import {
  diffWeather,
  recordWeatherChange,
} from "./weather-history-manager.js";
import {
  getWeatherOverlay,
  setWeatherOverlay,
  clearWeatherOverlay,
  getLastWeatherFingerprint,
  setLastWeatherFingerprint,
  beginWeatherSync,
  endWeatherSync,
} from "./weather-overlay.js";

export function fingerprintWeather(item) {
  if (!item) return "";
  // Smart Update: 天候・馬場・風向・風速・更新時刻（＋補助）
  return [
    item.weather,
    item.trackCondition,
    item.windDirection,
    item.windSpeed,
    item.updatedAt,
    item.temperature,
    item.humidity,
    item.surface,
    item.surfaceState,
    item.moisture,
  ].join("|");
}

export function syncWeather(item, options = {}) {
  if (!beginWeatherSync()) {
    return {
      changed: false,
      changes: [],
      fingerprint: getLastWeatherFingerprint(),
      skipped: true,
      reason: "re-entrancy",
    };
  }

  try {
    const prev = getWeatherOverlay()?.weather || null;
    const fp = fingerprintWeather(item);
    const prevFp = getLastWeatherFingerprint();
    const changes = diffWeather(prev, item);
    const changed = fp !== prevFp;

    const overlay = {
      weather: item,
      fingerprint: fp,
      updatedAt: new Date().toISOString(),
      meta: options.meta || {},
    };
    setWeatherOverlay(overlay);
    setLastWeatherFingerprint(fp);

    if (changed && changes.length) {
      for (const c of changes) {
        recordWeatherChange(c.type, c, "");
      }
    }

    const allowEmit =
      changed &&
      options.emitUpdate === true &&
      prevFp != null &&
      !options.silent &&
      changes.length > 0;

    if (allowEmit) {
      const primary = changes[0];
      emitEvent({
        type: primary?.type || "weather_change",
        detail: summarizeChanges(changes),
        payload: {
          weatherOnly: true,
          changes,
          fingerprint: fp,
        },
        source: "weather-engine",
      });
    }

    return { changed, changes, fingerprint: fp, overlay };
  } finally {
    endWeatherSync();
  }
}

function summarizeChanges(changes = []) {
  if (!changes.length) return "Weather 同期";
  const c = changes[0];
  const map = {
    weather_change: `天候変更: ${c.from}→${c.to}`,
    track_change: `馬場変更: ${c.from}→${c.to}`,
    wind_speed_change: `風速変化: ${c.from}→${c.to}`,
    wind_direction_change: `風向変化: ${c.from}→${c.to}`,
    moisture_updated: `含水率更新: ${c.from}→${c.to}`,
    weather_added: "天候情報追加",
  };
  return map[c.type] || `Weather変更: ${c.type}`;
}

export {
  getWeatherOverlay,
  clearWeatherOverlay,
  getLastWeatherFingerprint,
  setLastWeatherFingerprint,
};

export const WeatherSynchronizer = {
  sync: syncWeather,
  fingerprint: fingerprintWeather,
  getOverlay: getWeatherOverlay,
  clearOverlay: clearWeatherOverlay,
};
