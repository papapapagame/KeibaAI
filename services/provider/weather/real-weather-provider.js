/* ========================================
   RealWeatherProvider — Ver10.3
   ======================================== */

import {
  ProviderInterface,
  PROVIDER_HEALTH,
} from "../provider-interface.js";
import { fetchWeatherRawData } from "./weather-fetcher.js";
import { parseWeatherRaw } from "./weather-parser.js";
import { validateRealWeather } from "./weather-validator.js";
import { syncRealWeather, getWeatherUpdateCount } from "./weather-synchronizer.js";
import { normalizeRealWeather } from "./weather-normalizer.js";

export const REAL_WEATHER_PROVIDER_ID = "real-weather";
export const REAL_WEATHER_PROVIDER_VERSION = "10.3.0";

export class RealWeatherProvider extends ProviderInterface {
  constructor() {
    super({
      id: REAL_WEATHER_PROVIDER_ID,
      label: "Real Weather",
      kind: "Weather",
      enabled: true,
      implemented: true,
      priority: 40,
      version: REAL_WEATHER_PROVIDER_VERSION,
      health: PROVIDER_HEALTH.UNKNOWN,
    });
  }

  async loadWeather(options = {}) {
    const started = performance.now();
    this.setHealth(PROVIDER_HEALTH.WAITING);
    try {
      const fetched = await fetchWeatherRawData(options);
      const parsed = parseWeatherRaw(fetched.raw, this.id);
      const validation = validateRealWeather(parsed);

      if (!validation.ok) {
        this.setHealth(PROVIDER_HEALTH.ERROR);
        return {
          ok: false,
          blocked: false,
          providerId: this.id,
          message: "現在データを取得できません",
          userMessage: "現在データを取得できません",
          validation,
          item: null,
          weather: null,
          fetchedAt: fetched.fetchedAt,
          latencyMs: Math.round(performance.now() - started),
          source: "real-weather",
          mode: "real",
        };
      }

      const sync = syncRealWeather(
        { ...parsed, item: validation.acceptedItem },
        {
          validation,
          force: options.force,
          stage: options.stage,
          emitUpdate: options.emitUpdate === true,
          silent: options.silent !== false,
        }
      );

      if (!sync.ok) {
        this.setHealth(PROVIDER_HEALTH.ERROR);
        return {
          ok: false,
          blocked: false,
          providerId: this.id,
          message: sync.message || "現在データを取得できません",
          userMessage: "現在データを取得できません",
          validation: sync.validation || validation,
          item: null,
          weather: null,
          sync,
          fetchedAt: fetched.fetchedAt,
          latencyMs: Math.round(performance.now() - started),
          source: "real-weather",
          mode: "real",
        };
      }

      this.setHealth(PROVIDER_HEALTH.ONLINE);
      const state = sync.state;
      return {
        ok: true,
        blocked: false,
        providerId: this.id,
        providerName: state.providerName || this.label,
        message: sync.message || "Real Weather",
        userMessage: null,
        item: state.item,
        weather: state.item,
        weatherModel: state.weatherModel,
        trackModel: state.trackModel,
        scores: state.scores,
        validation,
        sync,
        meta: {
          ...(state.meta || {}),
          updatedAt: state.weatherUpdatedAt || state.updatedAt,
          phase: state.phase,
          skipped: sync.skipped,
          changed: sync.changed,
          fingerprint: sync.fingerprint,
          updateCount: state.updateCount,
        },
        phase: state.phase || "final",
        skipped: Boolean(sync.skipped),
        changed: Boolean(sync.changed),
        fingerprint: sync.fingerprint,
        updateCount: state.updateCount ?? getWeatherUpdateCount(),
        fetchedAt: fetched.fetchedAt || state.updatedAt,
        updatedAt: state.weatherUpdatedAt || state.updatedAt,
        count: state.item ? 1 : 0,
        latencyMs: Math.round(performance.now() - started),
        source: "real-weather",
        url: fetched.url,
        version: REAL_WEATHER_PROVIDER_VERSION,
        mode: "real",
      };
    } catch (err) {
      this.setHealth(PROVIDER_HEALTH.ERROR);
      return {
        ok: false,
        blocked: false,
        providerId: this.id,
        message: "現在データを取得できません",
        userMessage: "現在データを取得できません",
        error: {
          code: err?.code || "REAL_WEATHER_ERROR",
          message: err?.message || String(err),
        },
        item: null,
        weather: null,
        validation: {
          ok: false,
          errors: [{ code: "FETCH", message: err?.message || String(err) }],
          warnings: [],
        },
        latencyMs: Math.round(performance.now() - started),
        source: "real-weather",
        mode: "real",
      };
    }
  }

  async fetchWeather(options = {}) {
    const result = await this.loadWeather({
      ...options,
      silent: true,
      emitUpdate: false,
    });
    if (!result.ok) {
      throw Object.assign(new Error(result.userMessage || result.message), {
        code: "REAL_WEATHER_UNAVAILABLE",
        providerId: this.id,
      });
    }
    return {
      providerId: this.id,
      providerVersion: this.version,
      sourceLabel: "Real Weather",
      item: result.item,
      fetchedAt: result.fetchedAt,
      latencyMs: result.latencyMs,
      status: PROVIDER_HEALTH.ONLINE,
      health: PROVIDER_HEALTH.ONLINE,
    };
  }

  async fetchBundle(options = {}) {
    const result = await this.loadWeather({
      ...options,
      silent: true,
      emitUpdate: false,
    });
    if (!result.ok) {
      throw Object.assign(new Error(result.userMessage || result.message), {
        code: "REAL_WEATHER_UNAVAILABLE",
        providerId: this.id,
      });
    }
    const w = result.item || {};
    return {
      providerId: this.id,
      providerVersion: this.version,
      sourceLabel: "Real Weather",
      raw: {
        race: {
          date: result.meta?.raceDate,
          venue: result.meta?.venueId,
          number: result.meta?.raceNumber,
          weather: w.weather,
          trackCondition: w.trackCondition,
          temperature: w.temperature,
          humidity: w.humidity,
          windSpeed: w.windSpeed,
          windDirection: w.windDirection,
          moisture: w.moisture,
          precipitation: w.precipitation,
        },
        weather: w,
        settings: {},
      },
      count: { races: 1, horses: 0, weather: 1 },
      fetchedAt: result.fetchedAt,
      latencyMs: result.latencyMs,
      status: PROVIDER_HEALTH.ONLINE,
      health: PROVIDER_HEALTH.ONLINE,
    };
  }

  async ping() {
    try {
      const result = await fetchWeatherRawData({ force: false });
      this.setHealth(PROVIDER_HEALTH.ONLINE);
      return {
        ok: true,
        health: this._health,
        note: `Real Weather reachable (${result.latencyMs}ms)`,
      };
    } catch (err) {
      this.setHealth(PROVIDER_HEALTH.OFFLINE);
      return {
        ok: false,
        health: this._health,
        note: err?.message || "現在データを取得できません",
      };
    }
  }
}

export async function loadRealWeather(options = {}) {
  const provider = new RealWeatherProvider();
  return provider.loadWeather(options);
}

export const RealWeatherProviderApi = {
  Provider: RealWeatherProvider,
  load: loadRealWeather,
  normalize: normalizeRealWeather,
  validate: validateRealWeather,
  id: REAL_WEATHER_PROVIDER_ID,
  version: REAL_WEATHER_PROVIDER_VERSION,
};
