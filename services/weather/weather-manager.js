/* ========================================
   Weather Manager — Ver7.9
   ======================================== */

import { fetchWeatherRaw } from "./weather-repository.js";
import { validateWeather } from "./weather-validator.js";
import {
  syncWeather,
  fingerprintWeather,
  getWeatherOverlay,
  getLastWeatherFingerprint,
  setLastWeatherFingerprint,
} from "./weather-synchronizer.js";
import { loadWeatherHistory } from "./weather-history-manager.js";
import { analyzeTrackCondition } from "./track-condition-manager.js";
import {
  computeWeatherCompleteness,
  confidenceFromWeatherCompleteness,
  formatWeatherStagePanel,
  mergeWeatherOntoRace,
} from "./weather-merge.js";

export const WEATHER_ENGINE_VERSION = "7.9.0";

let currentWeather = null;
let lastIntel = null;
let lastUpdatedAt = null;
let syncStatus = "idle";
let lastPhase = "none";

export async function loadWeatherForAi(options = {}) {
  const fetched = await fetchWeatherRaw(options);
  if (!fetched.ok || !fetched.item) {
    setWeatherState(null, { syncStatus: "error", phase: "none" });
    return emptyBundle(options, fetched);
  }

  const validation = validateWeather(fetched.item);
  if (!validation.ok || !validation.sanitized) {
    setWeatherState(null, {
      syncStatus: "validation_error",
      phase: fetched.phase,
    });
    return {
      ok: false,
      blocked: false,
      message: "Weather Validation failed",
      userMessage: "天候情報を取得できませんでした",
      providerId: fetched.providerId,
      providerName: fetched.providerName || null,
      providerKind: fetched.mode === "real" ? "Real" : "Mock",
      mode: fetched.mode || "mock",
      version: WEATHER_ENGINE_VERSION,
      weather: null,
      validation,
      weatherCompleteness: computeWeatherCompleteness(null),
      stagePanel: formatWeatherStagePanel(options.stage || 0, null),
      sync: { status: "error" },
      confirmedStage: 0,
      effectiveStage: Number(options.stage) || 0,
      trackIntel: null,
    };
  }

  const weather = validation.sanitized;
  const trackIntel = analyzeTrackCondition(weather);
  const prevFp = getLastWeatherFingerprint();
  const fp = fingerprintWeather(weather);
  const contentChanged = fp !== prevFp;

  const sync = syncWeather(weather, {
    emitUpdate: options.emitUpdate === true && contentChanged && prevFp != null,
    silent: options.silent === true || options.emitUpdate === false,
    meta: fetched.meta,
  });
  setLastWeatherFingerprint(fp);

  const phase = fetched.phase || fetched.meta?.phase || "final";
  setWeatherState(weather, {
    updatedAt: fetched.meta?.updatedAt || weather.updatedAt,
    syncStatus: contentChanged ? "synced" : "skipped",
    phase,
    intel: trackIntel,
  });

  const baseStage = Number(options.stage ?? 0) || 0;
  const confirmedStage = computeWeatherConfirmedStage(weather, phase);
  const effectiveStage = Math.max(baseStage, confirmedStage);
  const weatherCompleteness = computeWeatherCompleteness(weather);
  const stagePanel = formatWeatherStagePanel(
    effectiveStage,
    weatherCompleteness
  );

  return {
    ok: true,
    blocked: false,
    message: contentChanged ? "Weather loaded" : "Weather unchanged",
    providerId: fetched.providerId,
    providerName: fetched.providerName || weather.providerName || null,
    providerKind: fetched.mode === "real" ? "Real" : "Mock",
    mode: fetched.mode || "mock",
    version: WEATHER_ENGINE_VERSION,
    changed: contentChanged,
    fingerprint: fp,
    weather,
    weatherModel: fetched.weatherModel || null,
    trackModel: fetched.trackModel || null,
    trackIntel,
    scores: fetched.scores || trackIntel,
    validation,
    weatherCompleteness,
    stagePanel,
    sync: {
      status: contentChanged ? "synced" : "skipped",
      changes: sync.changes?.length || 0,
    },
    updateCount: fetched.meta?.updateCount ?? 0,
    count: 1,
    fetchedAt: fetched.meta?.updatedAt || weather.updatedAt,
    phase,
    confirmedStage,
    effectiveStage,
    stageNote: stageNote(effectiveStage, phase),
    confidenceHint: confidenceFromWeatherCompleteness(
      options.baseConfidence ?? 86,
      weatherCompleteness
    ),
    history: loadWeatherHistory().slice(0, 8),
    userMessage: null,
  };
}

export function computeWeatherConfirmedStage(weather, phase = "final") {
  if (!weather?.weatherConfirmed || !weather?.trackConfirmed) return 0;
  if (phase === "eve" || phase === "previous") return 6;
  return 7;
}

export function mergeRaceWithWeather(race, weatherBundle, stage) {
  const s = Number(stage ?? weatherBundle?.effectiveStage ?? 0) || 0;
  return mergeWeatherOntoRace(race || {}, weatherBundle, s);
}

export function getWeatherDashboard() {
  return {
    version: WEATHER_ENGINE_VERSION,
    weather: currentWeather,
    trackIntel: lastIntel,
    updatedAt: lastUpdatedAt,
    syncStatus,
    phase: lastPhase,
    overlayUpdatedAt: getWeatherOverlay()?.updatedAt || lastUpdatedAt,
    fingerprint: getLastWeatherFingerprint(),
    history: loadWeatherHistory().slice(0, 10),
  };
}

export async function refreshWeatherOnly(options = {}) {
  return loadWeatherForAi({
    ...options,
    forceRefresh: true,
    emitUpdate: false,
    silent: true,
  });
}

function setWeatherState(weather, meta = {}) {
  currentWeather = weather || null;
  lastIntel = meta.intel || (weather ? analyzeTrackCondition(weather) : null);
  lastUpdatedAt = meta.updatedAt || new Date().toISOString();
  syncStatus = meta.syncStatus || "synced";
  lastPhase = meta.phase || lastPhase;
}

function stageNote(effectiveStage, phase) {
  if (effectiveStage >= 7) return "当日最新天候・馬場・風を反映";
  if (effectiveStage >= 6) return "前日天候・馬場を反映（当日最終は待機）";
  if (phase === "none") return "天候・馬場未取得";
  return "天候・馬場待機（Stage6未満）";
}

function emptyBundle(options, fetched) {
  const userMessage =
    fetched?.userMessage ||
    (fetched?.mode === "real"
      ? "天候情報を取得できませんでした"
      : fetched?.message || "天候情報を取得できませんでした");
  return {
    ok: false,
    blocked: Boolean(fetched?.blocked),
    message: fetched?.message || userMessage,
    userMessage,
    providerId: fetched?.providerId,
    providerName: fetched?.providerName || null,
    providerKind: fetched?.mode === "real" ? "Real" : "Mock",
    mode: fetched?.mode || "mock",
    version: WEATHER_ENGINE_VERSION,
    weather: null,
    validation: fetched?.validation || {
      ok: false,
      errors: [{ code: "FETCH", message: fetched?.message || userMessage }],
      warnings: [],
    },
    weatherCompleteness: computeWeatherCompleteness(null),
    stagePanel: formatWeatherStagePanel(options.stage || 0, null),
    sync: { status: "error" },
    confirmedStage: 0,
    effectiveStage: Number(options.stage) || 0,
    trackIntel: null,
    count: 0,
    updateCount: 0,
  };
}

export const WeatherManager = {
  loadForAi: loadWeatherForAi,
  mergeRace: mergeRaceWithWeather,
  confirmedStage: computeWeatherConfirmedStage,
  dashboard: getWeatherDashboard,
  refresh: refreshWeatherOnly,
  version: WEATHER_ENGINE_VERSION,
};
