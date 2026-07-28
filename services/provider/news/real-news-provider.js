/* ========================================
   RealNewsProvider — Ver10.4
   ======================================== */

import {
  ProviderInterface,
  PROVIDER_HEALTH,
} from "../provider-interface.js";
import { fetchNewsRawData } from "./news-fetcher.js";
import { parseNewsRaw } from "./news-parser.js";
import { extractNewsMetadata } from "./news-metadata-extractor.js";
import { validateRealNews } from "./news-validator.js";
import { syncRealNews, getNewsUpdateCount } from "./news-synchronizer.js";
import { normalizeRealNews } from "./news-normalizer.js";

export const REAL_NEWS_PROVIDER_ID = "real-news";
export const REAL_NEWS_PROVIDER_VERSION = "10.4.0";

export class RealNewsProvider extends ProviderInterface {
  constructor() {
    super({
      id: REAL_NEWS_PROVIDER_ID,
      label: "Real News",
      kind: "News",
      enabled: true,
      implemented: true,
      priority: 50,
      version: REAL_NEWS_PROVIDER_VERSION,
      health: PROVIDER_HEALTH.UNKNOWN,
    });
  }

  async loadNews(options = {}) {
    const started = performance.now();
    this.setHealth(PROVIDER_HEALTH.WAITING);
    try {
      const fetched = await fetchNewsRawData(options);
      const parsed = parseNewsRaw(fetched.raw, this.id);
      const extracted = extractNewsMetadata(parsed, {
        raceNumber: options.raceNumber,
        venueId: options.venueId,
      });
      const validation = validateRealNews(extracted, {
        raceNumber: options.raceNumber ?? extracted.meta?.raceNumber,
      });

      if (!validation.ok) {
        this.setHealth(PROVIDER_HEALTH.ERROR);
        return {
          ok: false,
          blocked: false,
          providerId: this.id,
          message: "現在データを取得できません",
          userMessage: "現在データを取得できません",
          validation,
          items: [],
          news: [],
          fetchedAt: fetched.fetchedAt,
          latencyMs: Math.round(performance.now() - started),
          source: "real-news",
          mode: "real",
        };
      }

      const sync = syncRealNews(
        { ...extracted, items: validation.acceptedItems },
        {
          validation,
          force: options.force,
          stage: options.stage,
          raceNumber: options.raceNumber,
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
          items: [],
          news: [],
          sync,
          fetchedAt: fetched.fetchedAt,
          latencyMs: Math.round(performance.now() - started),
          source: "real-news",
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
        message: sync.message || "Real News",
        userMessage: null,
        items: state.items,
        news: state.items,
        newsModels: state.newsModels,
        aggregate: state.aggregate,
        scores: state.scores,
        validation,
        sync,
        meta: {
          ...(state.meta || {}),
          updatedAt: state.newsUpdatedAt || state.updatedAt,
          skipped: sync.skipped,
          changed: sync.changed,
          fingerprint: sync.fingerprint,
          updateCount: state.updateCount,
        },
        skipped: Boolean(sync.skipped),
        changed: Boolean(sync.changed),
        fingerprint: sync.fingerprint,
        updateCount: state.updateCount ?? getNewsUpdateCount(),
        fetchedAt: fetched.fetchedAt || state.updatedAt,
        updatedAt: state.newsUpdatedAt || state.updatedAt,
        count: state.count || state.items.length,
        latencyMs: Math.round(performance.now() - started),
        source: "real-news",
        url: fetched.url,
        version: REAL_NEWS_PROVIDER_VERSION,
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
          code: err?.code || "REAL_NEWS_ERROR",
          message: err?.message || String(err),
        },
        items: [],
        news: [],
        validation: {
          ok: false,
          errors: [{ code: "FETCH", message: err?.message || String(err) }],
          warnings: [],
        },
        latencyMs: Math.round(performance.now() - started),
        source: "real-news",
        mode: "real",
      };
    }
  }

  async fetchNews(options = {}) {
    const result = await this.loadNews({
      ...options,
      silent: true,
      emitUpdate: false,
    });
    if (!result.ok) {
      throw Object.assign(new Error(result.userMessage || result.message), {
        code: "REAL_NEWS_UNAVAILABLE",
        providerId: this.id,
      });
    }
    return {
      providerId: this.id,
      providerVersion: this.version,
      sourceLabel: "Real News",
      items: result.items,
      fetchedAt: result.fetchedAt,
      latencyMs: result.latencyMs,
      status: PROVIDER_HEALTH.ONLINE,
      health: PROVIDER_HEALTH.ONLINE,
    };
  }

  async fetchBundle(options = {}) {
    const result = await this.loadNews({
      ...options,
      silent: true,
      emitUpdate: false,
    });
    if (!result.ok) {
      throw Object.assign(new Error(result.userMessage || result.message), {
        code: "REAL_NEWS_UNAVAILABLE",
        providerId: this.id,
      });
    }
    return {
      providerId: this.id,
      providerVersion: this.version,
      sourceLabel: "Real News",
      raw: {
        race: {
          date: result.meta?.raceDate,
          venue: result.meta?.venueId,
          number: result.meta?.raceNumber,
        },
        news: result.items,
        items: result.items,
        settings: {},
      },
      count: { races: 1, horses: 0, news: result.items.length },
      fetchedAt: result.fetchedAt,
      latencyMs: result.latencyMs,
      status: PROVIDER_HEALTH.ONLINE,
      health: PROVIDER_HEALTH.ONLINE,
    };
  }

  async ping() {
    try {
      const result = await fetchNewsRawData({ force: false });
      this.setHealth(PROVIDER_HEALTH.ONLINE);
      return {
        ok: true,
        health: this._health,
        note: `Real News reachable (${result.latencyMs}ms)`,
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

export async function loadRealNews(options = {}) {
  const provider = new RealNewsProvider();
  return provider.loadNews(options);
}

export const RealNewsProviderApi = {
  Provider: RealNewsProvider,
  load: loadRealNews,
  normalize: normalizeRealNews,
  validate: validateRealNews,
  id: REAL_NEWS_PROVIDER_ID,
  version: REAL_NEWS_PROVIDER_VERSION,
};
