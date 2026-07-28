/* ========================================
   PAPAPA IQ KEIBA - Weather & Track Engine API
   Ver7.9
   ======================================== */

export {
  WeatherManager,
  WEATHER_ENGINE_VERSION,
  loadWeatherForAi,
  mergeRaceWithWeather,
  computeWeatherConfirmedStage,
  getWeatherDashboard,
  refreshWeatherOnly,
} from "./weather-manager.js";

export { WeatherRepository, fetchWeatherRaw } from "./weather-repository.js";
export { WeatherValidator, validateWeather } from "./weather-validator.js";
export {
  WeatherSynchronizer,
  syncWeather,
  fingerprintWeather,
  getWeatherOverlay,
  clearWeatherOverlay,
} from "./weather-synchronizer.js";
export {
  WeatherHistoryManager,
  recordWeatherChange,
  loadWeatherHistory,
  diffWeather,
} from "./weather-history-manager.js";
export {
  TrackConditionManager,
  analyzeTrackCondition,
  computeTrackScore,
  computeWeatherScore,
  computeSurfaceScore,
} from "./track-condition-manager.js";
export {
  WeatherCompleteness,
  WeatherFormatter,
  WeatherMerge,
  computeWeatherCompleteness,
  confidenceFromWeatherCompleteness,
  formatWeatherStagePanel,
  mergeWeatherOntoRace,
  applyWeatherTrackAdjustments,
} from "./weather-merge.js";

export {
  getWeatherMode,
  setWeatherMode,
  WEATHER_MODE_KEY,
  WEATHER_MODES,
  WeatherMode,
} from "./weather-mode.js";
