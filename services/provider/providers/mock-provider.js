/* ========================================
   Mock Provider — Ver7.4（完全対応）
   ======================================== */

import { API_BASE_URL } from "../../../js/config.js";
import {
  ProviderInterface,
  PROVIDER_HEALTH,
  PROVIDER_VERSION,
} from "../provider-interface.js";

export class MockProvider extends ProviderInterface {
  constructor() {
    super({
      id: "mock",
      label: "Mock",
      kind: "all",
      enabled: true,
      implemented: true,
      priority: 90,
      version: PROVIDER_VERSION,
      health: PROVIDER_HEALTH.ONLINE,
    });
  }

  async fetchBundle(options = {}) {
    const started = performance.now();
    this.setHealth(PROVIDER_HEALTH.WAITING);
    try {
      if (options.forceError) {
        this.setHealth(PROVIDER_HEALTH.ERROR);
        throw Object.assign(new Error("Simulated network failure (debug)"), {
          code: "FORCE_ERROR",
        });
      }

      const [raceJson, horsesJson, settingsJson] = await Promise.all([
        fetchJson("race.json"),
        fetchJson("horses.json"),
        fetchJson("settings.json"),
      ]);

      const raceNumber =
        Number(options.raceNumber) ||
        Number(raceJson?.races?.[0]?.number) ||
        1;
      const rawRace =
        (raceJson?.races || []).find((r) => Number(r.number) === raceNumber) ||
        (raceJson?.races || [])[0] ||
        {};
      const venue =
        (raceJson?.venues || []).find((v) => v.id === rawRace.venue) || {};
      const rawHorses =
        horsesJson?.entries ||
        (horsesJson?.races || []).find((r) => Number(r.raceNumber) === raceNumber)
          ?.horses ||
        horsesJson?.horses ||
        [];

      const latencyMs = Math.round(performance.now() - started);
      this.setHealth(PROVIDER_HEALTH.ONLINE);

      return {
        providerId: this.id,
        providerVersion: this.version,
        sourceLabel: "Mock / local JSON",
        raw: {
          race: {
            ...rawRace,
            venue: rawRace.venue || venue.id,
            venueLabel: rawRace.venueLabel || venue.label || rawRace.venue,
            date: raceJson?.date || rawRace.date,
          },
          horses: rawHorses,
          settings: settingsJson || {},
          venues: raceJson?.venues || [],
          races: raceJson?.races || [],
        },
        count: {
          races: (raceJson?.races || []).length,
          horses: rawHorses.length,
        },
        fetchedAt: new Date().toISOString(),
        latencyMs,
        status: PROVIDER_HEALTH.ONLINE,
        health: PROVIDER_HEALTH.ONLINE,
      };
    } catch (err) {
      this.setHealth(PROVIDER_HEALTH.ERROR);
      throw err;
    }
  }

  async fetchRace(options = {}) {
    const bundle = await this.fetchBundle(options);
    return wrapItem(this, bundle, bundle.raw.race);
  }

  async fetchHorses(options = {}) {
    const bundle = await this.fetchBundle(options);
    return wrapItems(this, bundle, bundle.raw.horses || []);
  }

  async fetchHorse(options = {}) {
    const horses = await this.fetchHorses(options);
    const num = Number(options.number);
    const item =
      horses.items.find((h) => Number(h.number) === num) || horses.items[0] || null;
    return { ...horses, item, items: undefined };
  }

  async fetchJockey(options = {}) {
    const horses = await this.fetchHorses(options);
    const names = unique(
      horses.items.map((h) => h.jockey).filter(Boolean)
    ).map((name) => ({ name, providerId: this.id }));
    return wrapItems(this, horses, names);
  }

  async fetchTrainer(options = {}) {
    const horses = await this.fetchHorses(options);
    const names = unique(
      horses.items.map((h) => h.trainer).filter(Boolean)
    ).map((name) => ({ name, providerId: this.id }));
    return wrapItems(this, horses, names);
  }

  async fetchOdds(options = {}) {
    const bundle = await this.fetchBundle(options);
    const items = (bundle.raw.horses || []).map((h) => ({
      number: h.number,
      odds: h.odds,
      popularity: h.popularity,
    }));
    return wrapItems(this, bundle, items);
  }

  async fetchWeather(options = {}) {
    const race = await this.fetchRace(options);
    return wrapItem(this, race, {
      weather: race.item?.weather || "晴",
      providerId: this.id,
    });
  }

  async fetchTrackCondition(options = {}) {
    const race = await this.fetchRace(options);
    return wrapItem(this, race, {
      trackCondition: race.item?.trackCondition || race.item?.baba || "良",
      surface: race.item?.surface || race.item?.track || "芝",
      providerId: this.id,
    });
  }

  async fetchNews() {
    try {
      const json = await fetchJson("intelligence/news-feed.json");
      return {
        providerId: this.id,
        providerVersion: this.version,
        items: json?.articles || json?.trends || [],
        fetchedAt: new Date().toISOString(),
        status: PROVIDER_HEALTH.ONLINE,
        health: PROVIDER_HEALTH.ONLINE,
      };
    } catch {
      return {
        providerId: this.id,
        providerVersion: this.version,
        items: [],
        fetchedAt: new Date().toISOString(),
        status: PROVIDER_HEALTH.ONLINE,
        health: PROVIDER_HEALTH.ONLINE,
      };
    }
  }

  async fetchReview() {
    try {
      const json = await fetchJson("intelligence/review-feed.json");
      return {
        providerId: this.id,
        providerVersion: this.version,
        items: json?.reviews || json?.items || [],
        fetchedAt: new Date().toISOString(),
        status: PROVIDER_HEALTH.ONLINE,
        health: PROVIDER_HEALTH.ONLINE,
      };
    } catch {
      return {
        providerId: this.id,
        providerVersion: this.version,
        items: [],
        fetchedAt: new Date().toISOString(),
        status: PROVIDER_HEALTH.ONLINE,
        health: PROVIDER_HEALTH.ONLINE,
      };
    }
  }

  async fetchMarket(options = {}) {
    const odds = await this.fetchOdds(options);
    return wrapItem(this, odds, {
      heat: 55,
      sentiment: "neutral",
      overheat: false,
      summary: "Mock市場シグナル（実データ未接続）",
      oddsCount: odds.items?.length || 0,
    });
  }

  async ping() {
    this.setHealth(PROVIDER_HEALTH.ONLINE);
    return { ok: true, health: PROVIDER_HEALTH.ONLINE, note: "Mock ready" };
  }
}

function wrapItem(provider, bundle, item) {
  return {
    providerId: provider.id,
    providerVersion: provider.version,
    item,
    fetchedAt: bundle.fetchedAt || new Date().toISOString(),
    latencyMs: bundle.latencyMs,
    status: PROVIDER_HEALTH.ONLINE,
    health: PROVIDER_HEALTH.ONLINE,
  };
}

function wrapItems(provider, bundle, items) {
  return {
    providerId: provider.id,
    providerVersion: provider.version,
    items,
    fetchedAt: bundle.fetchedAt || new Date().toISOString(),
    latencyMs: bundle.latencyMs,
    status: PROVIDER_HEALTH.ONLINE,
    health: PROVIDER_HEALTH.ONLINE,
  };
}

function unique(arr) {
  return [...new Set(arr)];
}

async function fetchJson(path) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Mock fetch failed: ${url} (${res.status})`);
  return res.json();
}
