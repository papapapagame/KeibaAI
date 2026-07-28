/* ========================================
   WeatherSynchronizer — Ver10.3（Provider 層）
   天候・馬場・風向・風速・更新時刻の変更時のみ同期
   ======================================== */

import { emitEvent } from "../../update/event-watcher.js";
import {
  getWeatherOverlay,
  setWeatherOverlay,
  getLastWeatherFingerprint,
  setLastWeatherFingerprint,
  beginWeatherSync,
  endWeatherSync,
} from "../../weather/weather-overlay.js";
import { recordWeatherChange, diffWeather } from "../../weather/weather-history-manager.js";
import { normalizeRealWeather, fingerprintWeatherItem } from "./weather-normalizer.js";
import { validateRealWeather } from "./weather-validator.js";

export const WEATHER_PROVIDER_SYNC_VERSION = "10.3.0";
export const REAL_WEATHER_STORE_KEY = "papapa_iq_real_weather_v103";

let memoryState = null;
let updateCount = 0;

export function getRealWeatherState() {
  if (memoryState) return memoryState;
  try {
    const raw = sessionStorage.getItem(REAL_WEATHER_STORE_KEY);
    if (!raw) return null;
    memoryState = JSON.parse(raw);
    return memoryState;
  } catch {
    return null;
  }
}

export function setRealWeatherState(state) {
  memoryState = state || null;
  try {
    if (!state) sessionStorage.removeItem(REAL_WEATHER_STORE_KEY);
    else sessionStorage.setItem(REAL_WEATHER_STORE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  return memoryState;
}

export function clearRealWeatherState() {
  memoryState = null;
  try {
    sessionStorage.removeItem(REAL_WEATHER_STORE_KEY);
  } catch {
    /* ignore */
  }
}

export function getWeatherUpdateCount() {
  return updateCount || getRealWeatherState()?.updateCount || 0;
}

export function fingerprintRealWeather(item = {}) {
  // Smart Update: 天候・馬場・風向・風速・更新時刻
  return [
    "v103",
    item.weather,
    item.trackCondition,
    item.windDirection,
    item.windSpeed,
    item.updatedAt,
  ].join("|");
}

export function syncRealWeather(parsed, options = {}) {
  if (!beginWeatherSync()) {
    return {
      ok: false,
      changed: false,
      skipped: true,
      reason: "re-entrancy",
      state: getRealWeatherState(),
    };
  }

  try {
    const validation = options.validation || validateRealWeather(parsed);
    if (!validation.ok || !validation.acceptedItem) {
      return {
        ok: false,
        changed: false,
        skipped: false,
        reason: "validation_failed",
        validation,
        message: "天候情報を取得できませんでした",
        state: getRealWeatherState(),
      };
    }

    const normalized = normalizeRealWeather(
      validation.acceptedItem,
      { ...parsed.meta, providerId: parsed.providerId },
      { providerId: parsed.providerId || "real-weather" }
    );
    const item = normalized.item;
    const fp =
      fingerprintRealWeather(item) ||
      fingerprintWeatherItem(item) ||
      getLastWeatherFingerprint();
    const prevState = getRealWeatherState();
    const prevFp = prevState?.fingerprint || getLastWeatherFingerprint();
    const prevItem = prevState?.item || getWeatherOverlay()?.weather || null;
    const changed = Boolean(options.force) || fp !== prevFp;

    if (!changed && prevState && !options.force) {
      return {
        ok: true,
        changed: false,
        skipped: true,
        reason: "unchanged",
        fingerprint: fp,
        validation,
        normalized: prevState.normalized || normalized,
        state: prevState,
        message: "天候に変更なし（再取得スキップ）",
      };
    }

    const changes = diffWeather(prevItem, item);
    if (changed) {
      updateCount = (prevState?.updateCount || updateCount || 0) + 1;
      changes.forEach((c) => {
        recordWeatherChange(c.type || "weather_change", c, "Real Weather");
      });
      if (!changes.length) {
        recordWeatherChange(
          "weather_synced",
          { fingerprint: fp },
          "Real Weather"
        );
      }
    }

    const state = {
      version: WEATHER_PROVIDER_SYNC_VERSION,
      source: "real-weather",
      providerId: parsed.providerId || "real-weather",
      providerName: item.providerName || parsed.meta?.providerName || "Real Weather",
      updatedAt: new Date().toISOString(),
      weatherUpdatedAt: item.updatedAt,
      fingerprint: fp,
      item,
      weather: item,
      weatherModel: normalized.weatherModel,
      trackModel: normalized.trackModel,
      scores: normalized.scores,
      meta: parsed.meta || {},
      phase: parsed.meta?.phase || "final",
      validation: {
        ok: validation.ok,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
      },
      updateCount,
      changes,
      normalized,
    };

    setRealWeatherState(state);
    setWeatherOverlay({
      version: "10.3.0",
      source: "real-weather",
      providerId: state.providerId,
      updatedAt: state.updatedAt,
      weather: state.item,
      fingerprint: fp,
      meta: state.meta,
    });
    setLastWeatherFingerprint(fp);

    const allowEmit =
      changed &&
      options.emitUpdate === true &&
      prevFp != null &&
      !options.silent &&
      (changes || []).length > 0;

    if (allowEmit) {
      const primary = changes[0];
      emitEvent({
        type: primary?.type || "weather_change",
        detail: changes.map((c) => c.type).join(", "),
        payload: {
          weatherOnly: true,
          changes,
          fingerprint: fp,
          providerId: state.providerId,
        },
        source: "real-weather",
      });
    }

    return {
      ok: true,
      changed,
      skipped: false,
      fingerprint: fp,
      validation,
      normalized,
      changes,
      state,
      message: changed ? "Real Weather 同期完了" : "変更なし",
    };
  } finally {
    endWeatherSync();
  }
}

export function getRealWeatherDashboard() {
  const state = getRealWeatherState();
  if (!state) {
    return {
      available: false,
      providerId: null,
      status: "idle",
      count: 0,
      updateCount: getWeatherUpdateCount(),
      updatedAt: null,
      validation: null,
      syncStatus: "—",
    };
  }
  return {
    available: true,
    providerId: state.providerId,
    providerName: state.providerName,
    status: "online",
    count: state.item ? 1 : 0,
    updateCount: state.updateCount || 0,
    updatedAt: state.weatherUpdatedAt || state.updatedAt,
    validation: state.validation,
    syncStatus: "synced",
    fingerprint: state.fingerprint,
    scores: state.scores,
    item: state.item,
    phase: state.phase,
  };
}

export const WeatherSynchronizer = {
  sync: syncRealWeather,
  getState: getRealWeatherState,
  setState: setRealWeatherState,
  clear: clearRealWeatherState,
  fingerprint: fingerprintRealWeather,
  dashboard: getRealWeatherDashboard,
  version: WEATHER_PROVIDER_SYNC_VERSION,
};
