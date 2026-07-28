/* ========================================
   Real Weather Provider API — Ver10.3
   ======================================== */

export {
  RealWeatherProvider,
  loadRealWeather,
  RealWeatherProviderApi,
  REAL_WEATHER_PROVIDER_ID,
  REAL_WEATHER_PROVIDER_VERSION,
} from "./real-weather-provider.js";

export {
  WeatherFetcher,
  fetchWeatherRawData,
  WEATHER_FETCHER_VERSION,
} from "./weather-fetcher.js";

export {
  WeatherParser,
  parseWeatherRaw,
  WEATHER_PARSER_VERSION,
} from "./weather-parser.js";

export {
  WeatherNormalizer,
  normalizeRealWeather,
  fingerprintWeatherItem,
  WEATHER_NORMALIZER_VERSION,
} from "./weather-normalizer.js";

export {
  WeatherValidator,
  validateRealWeather,
  WEATHER_PROVIDER_VALIDATOR_VERSION,
} from "./weather-validator.js";

export {
  WeatherSynchronizer,
  syncRealWeather,
  getRealWeatherState,
  clearRealWeatherState,
  getRealWeatherDashboard,
  fingerprintRealWeather,
  getWeatherUpdateCount,
  WEATHER_PROVIDER_SYNC_VERSION,
} from "./weather-synchronizer.js";

export {
  TrackConditionParser,
  parseTrackCondition,
  TRACK_CONDITION_PARSER_VERSION,
} from "./track-condition-parser.js";
