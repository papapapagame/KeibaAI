/* ========================================
   Weather source mode — Ver10.3
   Mock / Real 手動切替（自動フォールバックなし）
   ======================================== */

export const WEATHER_MODE_KEY = "papapa_iq_weather_mode_v103";
export const WEATHER_MODES = ["mock", "real"];

export function getWeatherMode() {
  try {
    const v = localStorage.getItem(WEATHER_MODE_KEY);
    if (WEATHER_MODES.includes(v)) return v;
  } catch {
    /* ignore */
  }
  return "mock";
}

export function setWeatherMode(mode) {
  const next = WEATHER_MODES.includes(mode) ? mode : "mock";
  try {
    localStorage.setItem(WEATHER_MODE_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}

export const WeatherMode = {
  get: getWeatherMode,
  set: setWeatherMode,
  key: WEATHER_MODE_KEY,
  modes: WEATHER_MODES,
};
