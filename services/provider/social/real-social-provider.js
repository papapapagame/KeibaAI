/* ========================================
   RealSocialProvider — Ver10.5
   ======================================== */

import {
  ProviderInterface,
  PROVIDER_HEALTH,
} from "../provider-interface.js";
import { fetchSocialRawData } from "./social-fetcher.js";
import { parseSocialRaw } from "./social-parser.js";
import { extractTrendMetadata } from "./trend-metadata-extractor.js";
import { validateRealSocial } from "./social-validator.js";
import {
  syncRealSocial,
  getSocialUpdateCount,
} from "./social-synchronizer.js";
import { normalizeRealSocial } from "./social-normalizer.js";

export const REAL_SOCIAL_PROVIDER_ID = "real-social";
export const REAL_SOCIAL_PROVIDER_VERSION = "10.5.0";

export class RealSocialProvider extends ProviderInterface {
  constructor() {
    super({
      id: REAL_SOCIAL_PROVIDER_ID,
      label: "Real Social",
      kind: "Social",
      enabled: true,
      implemented: true,
      priority: 60,
      version: REAL_SOCIAL_PROVIDER_VERSION,
      health: PROVIDER_HEALTH.UNKNOWN,
    });
  }

  async loadSocial(options = {}) {
    const started = performance.now();
    this.setHealth(PROVIDER_HEALTH.WAITING);
    try {
      const fetched = await fetchSocialRawData(options);
      const parsed = parseSocialRaw(fetched.raw, this.id);
      const extracted = extractTrendMetadata(parsed, {
        raceNumber: options.raceNumber,
        venueId: options.venueId,
      });
      const validation = validateRealSocial(extracted, {
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
          social: [],
          fetchedAt: fetched.fetchedAt,
          latencyMs: Math.round(performance.now() - started),
          source: "real-social",
          mode: "real",
        };
      }

      const sync = syncRealSocial(
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
          social: [],
          sync,
          fetchedAt: fetched.fetchedAt,
          latencyMs: Math.round(performance.now() - started),
          source: "real-social",
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
        message: sync.message || "Real Social",
        userMessage: null,
        items: state.items,
        social: state.items,
        trends: state.trends,
        socialModel: state.socialModel,
        scores: state.scores,
        validation,
        sync,
        meta: {
          ...(state.meta || {}),
          updatedAt: state.socialUpdatedAt || state.updatedAt,
          skipped: sync.skipped,
          changed: sync.changed,
          fingerprint: sync.fingerprint,
          updateCount: state.updateCount,
        },
        skipped: Boolean(sync.skipped),
        changed: Boolean(sync.changed),
        fingerprint: sync.fingerprint,
        updateCount: state.updateCount ?? getSocialUpdateCount(),
        fetchedAt: fetched.fetchedAt || state.updatedAt,
        updatedAt: state.socialUpdatedAt || state.updatedAt,
        count: state.count || state.items.length,
        latencyMs: Math.round(performance.now() - started),
        source: "real-social",
        url: fetched.url,
        version: REAL_SOCIAL_PROVIDER_VERSION,
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
          code: err?.code || "REAL_SOCIAL_ERROR",
          message: err?.message || String(err),
        },
        items: [],
        social: [],
        validation: {
          ok: false,
          errors: [{ code: "FETCH", message: err?.message || String(err) }],
          warnings: [],
        },
        latencyMs: Math.round(performance.now() - started),
        source: "real-social",
        mode: "real",
      };
    }
  }

  async fetchSocial(options = {}) {
    const result = await this.loadSocial({
      ...options,
      silent: true,
      emitUpdate: false,
    });
    if (!result.ok) {
      throw Object.assign(new Error(result.userMessage || result.message), {
        code: "REAL_SOCIAL_UNAVAILABLE",
        providerId: this.id,
      });
    }
    return {
      providerId: this.id,
      providerVersion: this.version,
      sourceLabel: "Real Social",
      items: result.items,
      fetchedAt: result.fetchedAt,
      latencyMs: result.latencyMs,
      status: PROVIDER_HEALTH.ONLINE,
      health: PROVIDER_HEALTH.ONLINE,
    };
  }

  async fetchBundle(options = {}) {
    const result = await this.loadSocial({
      ...options,
      silent: true,
      emitUpdate: false,
    });
    if (!result.ok) {
      throw Object.assign(new Error(result.userMessage || result.message), {
        code: "REAL_SOCIAL_UNAVAILABLE",
        providerId: this.id,
      });
    }
    return {
      providerId: this.id,
      providerVersion: this.version,
      sourceLabel: "Real Social",
      raw: {
        race: {
          date: result.meta?.raceDate,
          venue: result.meta?.venueId,
          number: result.meta?.raceNumber,
        },
        social: result.items,
        items: result.items,
        settings: {},
      },
      count: { races: 1, horses: 0, social: result.items.length },
      fetchedAt: result.fetchedAt,
      latencyMs: result.latencyMs,
      status: PROVIDER_HEALTH.ONLINE,
      health: PROVIDER_HEALTH.ONLINE,
    };
  }

  async ping() {
    try {
      const result = await fetchSocialRawData({ force: false });
      this.setHealth(PROVIDER_HEALTH.ONLINE);
      return {
        ok: true,
        health: this._health,
        note: `Real Social reachable (${result.latencyMs}ms)`,
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

export async function loadRealSocial(options = {}) {
  const provider = new RealSocialProvider();
  return provider.loadSocial(options);
}

export const RealSocialProviderApi = {
  Provider: RealSocialProvider,
  load: loadRealSocial,
  normalize: normalizeRealSocial,
  validate: validateRealSocial,
  id: REAL_SOCIAL_PROVIDER_ID,
  version: REAL_SOCIAL_PROVIDER_VERSION,
};
