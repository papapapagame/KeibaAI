/* ========================================
   RealOddsProvider — Ver10.2
   ======================================== */

import {
  ProviderInterface,
  PROVIDER_HEALTH,
} from "../provider-interface.js";
import { fetchOddsRawData } from "./odds-fetcher.js";
import { parseOddsRaw } from "./odds-parser.js";
import { validateRealOdds } from "./odds-validator.js";
import { syncRealOdds } from "./odds-synchronizer.js";
import { normalizeRealOdds } from "./odds-normalizer.js";
import { getOddsUpdateCount } from "./odds-history-manager.js";
import {
  hasRaceScope,
  raceScopeMatches,
  selectRaceCard,
} from "../live/race-scope.js";

export const REAL_ODDS_PROVIDER_ID = "real-odds";
export const REAL_ODDS_PROVIDER_VERSION = "10.2.0";

export class RealOddsProvider extends ProviderInterface {
  constructor() {
    super({
      id: REAL_ODDS_PROVIDER_ID,
      label: "Real Odds",
      kind: "Odds",
      enabled: true,
      implemented: true,
      priority: 30,
      version: REAL_ODDS_PROVIDER_VERSION,
      health: PROVIDER_HEALTH.UNKNOWN,
    });
  }

  async loadOdds(options = {}) {
    const started = performance.now();
    this.setHealth(PROVIDER_HEALTH.WAITING);
    try {
      const fetched = await fetchOddsRawData(options);
      const card = selectRaceCard(fetched.raw, options);
      if (hasRaceScope(options) && !card) {
        this.setHealth(PROVIDER_HEALTH.ERROR);
        return {
          ok: false,
          blocked: false,
          providerId: this.id,
          message: "現在データを取得できません",
          userMessage: "現在データを取得できません",
          validation: {
            ok: false,
            errors: [
              {
                code: "RACE_SCOPE",
                message: "対象レースのオッズがありません",
              },
            ],
            warnings: [],
          },
          odds: [],
          items: [],
          fetchedAt: fetched.fetchedAt,
          latencyMs: Math.round(performance.now() - started),
          source: "real-odds",
          mode: "real",
        };
      }
      const parsed = parseOddsRaw(card || fetched.raw, this.id);
      if (hasRaceScope(options) && !raceScopeMatches(parsed.meta || {}, options)) {
        this.setHealth(PROVIDER_HEALTH.ERROR);
        return {
          ok: false,
          blocked: false,
          providerId: this.id,
          message: "現在データを取得できません",
          userMessage: "現在データを取得できません",
          validation: {
            ok: false,
            errors: [
              {
                code: "RACE_SCOPE",
                message: "対象レースのオッズがありません",
              },
            ],
            warnings: [],
          },
          odds: [],
          items: [],
          fetchedAt: fetched.fetchedAt,
          latencyMs: Math.round(performance.now() - started),
          source: "real-odds",
          mode: "real",
        };
      }
      const validation = validateRealOdds(parsed);

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
          odds: [],
          fetchedAt: fetched.fetchedAt,
          latencyMs: Math.round(performance.now() - started),
          source: "real-odds",
          mode: "real",
        };
      }

      const sync = syncRealOdds(
        { ...parsed, items: validation.acceptedItems },
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
          items: [],
          odds: [],
          sync,
          fetchedAt: fetched.fetchedAt,
          latencyMs: Math.round(performance.now() - started),
          source: "real-odds",
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
        message: sync.message || "Real Odds",
        userMessage: null,
        items: state.odds,
        odds: state.odds,
        oddsEntries: state.oddsEntries,
        horses: state.horses,
        marketStatus: state.marketStatus,
        validation,
        sync,
        meta: {
          ...(state.meta || {}),
          updatedAt: state.oddsUpdatedAt || state.updatedAt,
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
        updateCount: state.updateCount ?? getOddsUpdateCount(),
        fetchedAt: fetched.fetchedAt || state.updatedAt,
        updatedAt: state.oddsUpdatedAt || state.updatedAt,
        count: state.odds.length,
        latencyMs: Math.round(performance.now() - started),
        source: "real-odds",
        url: fetched.url,
        version: REAL_ODDS_PROVIDER_VERSION,
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
          code: err?.code || "REAL_ODDS_ERROR",
          message: err?.message || String(err),
        },
        items: [],
        odds: [],
        validation: {
          ok: false,
          errors: [{ code: "FETCH", message: err?.message || String(err) }],
          warnings: [],
        },
        latencyMs: Math.round(performance.now() - started),
        source: "real-odds",
        mode: "real",
      };
    }
  }

  async fetchOdds(options = {}) {
    const result = await this.loadOdds({
      ...options,
      silent: true,
      emitUpdate: false,
    });
    if (!result.ok) {
      throw Object.assign(new Error(result.userMessage || result.message), {
        code: "REAL_ODDS_UNAVAILABLE",
        providerId: this.id,
      });
    }
    return {
      providerId: this.id,
      providerVersion: this.version,
      sourceLabel: "Real Odds",
      items: result.odds,
      fetchedAt: result.fetchedAt,
      latencyMs: result.latencyMs,
      status: PROVIDER_HEALTH.ONLINE,
      health: PROVIDER_HEALTH.ONLINE,
    };
  }

  async fetchBundle(options = {}) {
    const result = await this.loadOdds({
      ...options,
      silent: true,
      emitUpdate: false,
    });
    if (!result.ok) {
      throw Object.assign(new Error(result.userMessage || result.message), {
        code: "REAL_ODDS_UNAVAILABLE",
        providerId: this.id,
      });
    }
    return {
      providerId: this.id,
      providerVersion: this.version,
      sourceLabel: "Real Odds",
      raw: {
        race: {
          date: result.meta?.raceDate,
          venue: result.meta?.venueId,
          number: result.meta?.raceNumber,
        },
        horses: (result.odds || []).map((o) => ({
          number: o.number,
          horse: o.horse,
          odds: o.winOdds,
          placeOdds: o.placeOdds,
          popularity: o.popularity,
          marketIndex: o.marketIndex,
        })),
        odds: result.odds,
        settings: {},
      },
      count: { races: 1, horses: result.odds.length },
      fetchedAt: result.fetchedAt,
      latencyMs: result.latencyMs,
      status: PROVIDER_HEALTH.ONLINE,
      health: PROVIDER_HEALTH.ONLINE,
    };
  }

  async ping() {
    try {
      const result = await fetchOddsRawData({ force: false });
      this.setHealth(PROVIDER_HEALTH.ONLINE);
      return {
        ok: true,
        health: this._health,
        note: `Real Odds reachable (${result.latencyMs}ms)`,
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

export async function loadRealOdds(options = {}) {
  const provider = new RealOddsProvider();
  return provider.loadOdds(options);
}

export const RealOddsProviderApi = {
  Provider: RealOddsProvider,
  load: loadRealOdds,
  normalize: normalizeRealOdds,
  validate: validateRealOdds,
  id: REAL_ODDS_PROVIDER_ID,
  version: REAL_ODDS_PROVIDER_VERSION,
};
