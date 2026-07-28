/* ========================================
   RealRaceProvider — Ver10.0
   Real Race Calendar Provider（Mock と切替可能）
   ======================================== */

import {
  ProviderInterface,
  PROVIDER_HEALTH,
} from "../provider-interface.js";
import { fetchRaceCalendarRaw } from "./race-calendar-fetcher.js";
import { parseRaceCalendarRaw } from "./race-calendar-parser.js";
import { validateRaceCalendar } from "./race-calendar-validator.js";
import { syncRaceCalendar } from "./race-calendar-synchronizer.js";
import { normalizeRaceCalendar } from "./race-calendar-normalizer.js";

export const REAL_RACE_PROVIDER_ID = "real-race";
export const REAL_RACE_PROVIDER_VERSION = "10.0.0";

export class RealRaceProvider extends ProviderInterface {
  constructor() {
    super({
      id: REAL_RACE_PROVIDER_ID,
      label: "Real Race",
      kind: "Race",
      enabled: true,
      implemented: true,
      priority: 20,
      version: REAL_RACE_PROVIDER_VERSION,
      health: PROVIDER_HEALTH.UNKNOWN,
    });
  }

  /**
   * フルパイプライン: Fetch → Parse → Validate → Normalize → Sync
   * 失敗時は Mock へ自動切替しない（呼び出し側でメッセージ表示）
   */
  async loadCalendar(options = {}) {
    const started = performance.now();
    this.setHealth(PROVIDER_HEALTH.WAITING);
    try {
      const fetched = await fetchRaceCalendarRaw(options);
      const parsed = parseRaceCalendarRaw(fetched.raw, this.id);
      const validation = validateRaceCalendar(parsed);

      if (!validation.ok) {
        this.setHealth(PROVIDER_HEALTH.ERROR);
        return {
          ok: false,
          blocked: false,
          providerId: this.id,
          message: "現在実データを取得できません",
          userMessage: "現在実データを取得できません",
          validation,
          meetings: [],
          races: [],
          fetchedAt: fetched.fetchedAt,
          latencyMs: Math.round(performance.now() - started),
          source: "real-race",
        };
      }

      const sync = syncRaceCalendar(
        {
          ...parsed,
          meetings: validation.acceptedMeetings,
          races: validation.acceptedRaces,
        },
        {
          validation,
          force: options.force,
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
          message: sync.message || "現在実データを取得できません",
          userMessage: "現在実データを取得できません",
          validation: sync.validation || validation,
          meetings: [],
          races: [],
          sync,
          fetchedAt: fetched.fetchedAt,
          latencyMs: Math.round(performance.now() - started),
          source: "real-race",
        };
      }

      this.setHealth(PROVIDER_HEALTH.ONLINE);
      const state = sync.state;
      return {
        ok: true,
        blocked: false,
        providerId: this.id,
        message: sync.message || "Real Race Calendar",
        meetings: state.meetings,
        races: state.races,
        legacyRaces: state.legacyRaces,
        raceStages: state.raceStages,
        calendar: state.calendar,
        schedules: state.schedules,
        unifiedRaces: state.unifiedRaces,
        validation,
        sync,
        skipped: Boolean(sync.skipped),
        changed: Boolean(sync.changed),
        fingerprint: sync.fingerprint,
        fetchedAt: fetched.fetchedAt || state.updatedAt,
        updatedAt: state.updatedAt,
        latencyMs: Math.round(performance.now() - started),
        source: "real-race",
        url: fetched.url,
        version: REAL_RACE_PROVIDER_VERSION,
      };
    } catch (err) {
      this.setHealth(PROVIDER_HEALTH.ERROR);
      return {
        ok: false,
        blocked: false,
        providerId: this.id,
        message: "現在実データを取得できません",
        userMessage: "現在実データを取得できません",
        error: {
          code: err?.code || "REAL_RACE_ERROR",
          message: err?.message || String(err),
        },
        meetings: [],
        races: [],
        validation: {
          ok: false,
          errors: [{ code: "FETCH", message: err?.message || String(err) }],
          warnings: [],
        },
        latencyMs: Math.round(performance.now() - started),
        source: "real-race",
      };
    }
  }

  async fetchRace(options = {}) {
    const cal = await this.loadCalendar({
      ...options,
      silent: true,
      emitUpdate: false,
    });
    if (!cal.ok) {
      throw Object.assign(new Error(cal.userMessage || cal.message), {
        code: "REAL_RACE_UNAVAILABLE",
        providerId: this.id,
      });
    }
    const races = cal.legacyRaces || cal.races || [];
    const number = Number(options.raceNumber) || Number(races[0]?.number) || 1;
    const date = options.date || "";
    const venueId = options.venueId || options.venue || "";
    const item =
      races.find(
        (r) =>
          Number(r.number) === number &&
          (!date || r.date === date) &&
          (!venueId || r.venue === venueId || r.venueId === venueId)
      ) || races[0] || null;
    return {
      providerId: this.id,
      providerVersion: this.version,
      sourceLabel: "Real Race Calendar",
      item,
      fetchedAt: cal.fetchedAt,
      latencyMs: cal.latencyMs,
      status: PROVIDER_HEALTH.ONLINE,
      health: PROVIDER_HEALTH.ONLINE,
    };
  }

  async fetchBundle(options = {}) {
    const cal = await this.loadCalendar({
      ...options,
      silent: true,
      emitUpdate: false,
    });
    if (!cal.ok) {
      throw Object.assign(new Error(cal.userMessage || cal.message), {
        code: "REAL_RACE_UNAVAILABLE",
        providerId: this.id,
      });
    }
    const races = cal.legacyRaces || [];
    const raceNumber = Number(options.raceNumber) || Number(races[0]?.number) || 1;
    const rawRace =
      races.find((r) => Number(r.number) === raceNumber) || races[0] || {};
    return {
      providerId: this.id,
      providerVersion: this.version,
      sourceLabel: "Real Race Calendar",
      raw: {
        race: rawRace,
        horses: [],
        settings: {},
        venues: cal.schedules?.map((s) => s.venue) || [],
        races,
        calendar: cal.calendar,
        meetings: cal.meetings,
      },
      count: {
        races: races.length,
        horses: 0,
        meetings: cal.meetings?.length || 0,
      },
      fetchedAt: cal.fetchedAt,
      latencyMs: cal.latencyMs,
      status: PROVIDER_HEALTH.ONLINE,
      health: PROVIDER_HEALTH.ONLINE,
    };
  }

  async ping() {
    try {
      const result = await fetchRaceCalendarRaw({ force: false });
      this.setHealth(PROVIDER_HEALTH.ONLINE);
      return {
        ok: true,
        health: this._health,
        note: `Real Race reachable (${result.latencyMs}ms)`,
      };
    } catch (err) {
      this.setHealth(PROVIDER_HEALTH.OFFLINE);
      return {
        ok: false,
        health: this._health,
        note: err?.message || "現在実データを取得できません",
      };
    }
  }
}

/**
 * 高水準 API（Calendar Engine から呼ぶ）
 */
export async function loadRealRaceCalendar(options = {}) {
  const provider = new RealRaceProvider();
  return provider.loadCalendar(options);
}

export const RealRaceProviderApi = {
  Provider: RealRaceProvider,
  load: loadRealRaceCalendar,
  normalize: normalizeRaceCalendar,
  validate: validateRaceCalendar,
  id: REAL_RACE_PROVIDER_ID,
  version: REAL_RACE_PROVIDER_VERSION,
};
