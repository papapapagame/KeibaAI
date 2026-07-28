/* ========================================
   RealHorseProvider — Ver10.1
   Real Horse Entry Provider（Mock と切替可能）
   ======================================== */

import {
  ProviderInterface,
  PROVIDER_HEALTH,
} from "../provider-interface.js";
import { fetchHorseEntryRaw } from "./horse-entry-fetcher.js";
import { parseHorseEntryRaw } from "./horse-entry-parser.js";
import { validateHorseEntries } from "./horse-entry-validator.js";
import { syncHorseEntries } from "./horse-entry-synchronizer.js";
import { normalizeHorseEntries } from "./horse-entry-normalizer.js";

export const REAL_HORSE_PROVIDER_ID = "real-horse";
export const REAL_HORSE_PROVIDER_VERSION = "10.1.0";

export class RealHorseProvider extends ProviderInterface {
  constructor() {
    super({
      id: REAL_HORSE_PROVIDER_ID,
      label: "Real Horse",
      kind: "Horse",
      enabled: true,
      implemented: true,
      priority: 25,
      version: REAL_HORSE_PROVIDER_VERSION,
      health: PROVIDER_HEALTH.UNKNOWN,
    });
  }

  /**
   * Fetch → Parse → Validate → Normalize → Sync
   * 失敗時は Mock へ自動切替しない
   */
  async loadEntries(options = {}) {
    const started = performance.now();
    this.setHealth(PROVIDER_HEALTH.WAITING);
    try {
      const fetched = await fetchHorseEntryRaw(options);
      const parsed = parseHorseEntryRaw(fetched.raw, this.id);
      const validation = validateHorseEntries(parsed);

      if (!validation.ok) {
        this.setHealth(PROVIDER_HEALTH.ERROR);
        return {
          ok: false,
          blocked: false,
          providerId: this.id,
          message: "現在データを取得できません",
          userMessage: "現在データを取得できません",
          validation,
          entries: [],
          fetchedAt: fetched.fetchedAt,
          latencyMs: Math.round(performance.now() - started),
          source: "real-horse",
        };
      }

      const sync = syncHorseEntries(
        {
          ...parsed,
          entries: validation.acceptedEntries,
        },
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
          entries: [],
          sync,
          fetchedAt: fetched.fetchedAt,
          latencyMs: Math.round(performance.now() - started),
          source: "real-horse",
        };
      }

      this.setHealth(PROVIDER_HEALTH.ONLINE);
      const state = sync.state;
      return {
        ok: true,
        blocked: false,
        providerId: this.id,
        message: sync.message || "Real Horse Entry",
        userMessage: null,
        entries: state.entries,
        horses: state.horses,
        draws: state.draws,
        jockeys: state.jockeys,
        trainers: state.trainers,
        unified: state.entries,
        validation,
        sync,
        meta: state.meta,
        confirmation: state.confirmation,
        skipped: Boolean(sync.skipped),
        changed: Boolean(sync.changed),
        fingerprint: sync.fingerprint,
        fetchedAt: fetched.fetchedAt || state.updatedAt,
        updatedAt: state.updatedAt,
        count: state.entries.length,
        latencyMs: Math.round(performance.now() - started),
        source: "real-horse",
        url: fetched.url,
        version: REAL_HORSE_PROVIDER_VERSION,
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
          code: err?.code || "REAL_HORSE_ERROR",
          message: err?.message || String(err),
        },
        entries: [],
        validation: {
          ok: false,
          errors: [{ code: "FETCH", message: err?.message || String(err) }],
          warnings: [],
        },
        latencyMs: Math.round(performance.now() - started),
        source: "real-horse",
        mode: "real",
      };
    }
  }

  async fetchHorses(options = {}) {
    const result = await this.loadEntries({
      ...options,
      silent: true,
      emitUpdate: false,
    });
    if (!result.ok) {
      throw Object.assign(new Error(result.userMessage || result.message), {
        code: "REAL_HORSE_UNAVAILABLE",
        providerId: this.id,
      });
    }
    return {
      providerId: this.id,
      providerVersion: this.version,
      sourceLabel: "Real Horse Entry",
      items: result.entries,
      fetchedAt: result.fetchedAt,
      latencyMs: result.latencyMs,
      status: PROVIDER_HEALTH.ONLINE,
      health: PROVIDER_HEALTH.ONLINE,
    };
  }

  async fetchHorse(options = {}) {
    const horses = await this.fetchHorses(options);
    const num = Number(options.number);
    const item =
      horses.items.find((h) => Number(h.number) === num) ||
      horses.items[0] ||
      null;
    return { ...horses, item, items: undefined };
  }

  async fetchBundle(options = {}) {
    const result = await this.loadEntries({
      ...options,
      silent: true,
      emitUpdate: false,
    });
    if (!result.ok) {
      throw Object.assign(new Error(result.userMessage || result.message), {
        code: "REAL_HORSE_UNAVAILABLE",
        providerId: this.id,
      });
    }
    return {
      providerId: this.id,
      providerVersion: this.version,
      sourceLabel: "Real Horse Entry",
      raw: {
        race: {
          date: result.meta?.raceDate,
          venue: result.meta?.venueId,
          number: result.meta?.raceNumber,
        },
        horses: result.entries,
        settings: {},
        draws: result.draws,
        jockeys: result.jockeys,
        trainers: result.trainers,
      },
      count: {
        races: 1,
        horses: result.entries.length,
      },
      fetchedAt: result.fetchedAt,
      latencyMs: result.latencyMs,
      status: PROVIDER_HEALTH.ONLINE,
      health: PROVIDER_HEALTH.ONLINE,
    };
  }

  async ping() {
    try {
      const result = await fetchHorseEntryRaw({ force: false });
      this.setHealth(PROVIDER_HEALTH.ONLINE);
      return {
        ok: true,
        health: this._health,
        note: `Real Horse reachable (${result.latencyMs}ms)`,
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

export async function loadRealHorseEntries(options = {}) {
  const provider = new RealHorseProvider();
  return provider.loadEntries(options);
}

export const RealHorseProviderApi = {
  Provider: RealHorseProvider,
  load: loadRealHorseEntries,
  normalize: normalizeHorseEntries,
  validate: validateHorseEntries,
  id: REAL_HORSE_PROVIDER_ID,
  version: REAL_HORSE_PROVIDER_VERSION,
};
