/* ========================================
   MockProvider — Ver7.0（唯一の実装済み Provider）
   ======================================== */

import { API_BASE_URL } from "../../../js/config.js";
import { BaseDataProvider, PROVIDER_STATUS } from "./base-provider.js";

export class MockProvider extends BaseDataProvider {
  constructor() {
    super({
      id: "mock",
      label: "Mock Provider",
      kind: "all",
      implemented: true,
      priority: 1,
    });
  }

  async fetchBundle(options = {}) {
    const started = performance.now();
    const [raceJson, horsesJson, settingsJson] = await Promise.all([
      fetchJson("race.json"),
      fetchJson("horses.json"),
      fetchJson("settings.json"),
    ]);

    const raceNumber = Number(options.raceNumber) || Number(raceJson?.races?.[0]?.number) || 1;
    const rawRace =
      (raceJson?.races || []).find((r) => Number(r.number) === raceNumber) ||
      (raceJson?.races || [])[0] ||
      {};
    const venue = (raceJson?.venues || []).find((v) => v.id === rawRace.venue) || {};
    const rawHorses =
      horsesJson?.entries ||
      (horsesJson?.races || []).find((r) => Number(r.raceNumber) === raceNumber)
        ?.horses ||
      horsesJson?.horses ||
      [];

    const latencyMs = Math.round(performance.now() - started);
    return {
      providerId: this.id,
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
      status: PROVIDER_STATUS.ONLINE,
    };
  }

  async fetchRaces() {
    const bundle = await this.fetchBundle();
    return {
      providerId: this.id,
      items: bundle.raw.races || [],
      fetchedAt: bundle.fetchedAt,
      latencyMs: bundle.latencyMs,
      status: PROVIDER_STATUS.ONLINE,
    };
  }

  async fetchRace(options = {}) {
    const bundle = await this.fetchBundle(options);
    return {
      providerId: this.id,
      item: bundle.raw.race,
      fetchedAt: bundle.fetchedAt,
      latencyMs: bundle.latencyMs,
      status: PROVIDER_STATUS.ONLINE,
    };
  }

  async fetchHorses(options = {}) {
    const bundle = await this.fetchBundle(options);
    return {
      providerId: this.id,
      items: bundle.raw.horses || [],
      fetchedAt: bundle.fetchedAt,
      latencyMs: bundle.latencyMs,
      status: PROVIDER_STATUS.ONLINE,
    };
  }

  async fetchOdds(options = {}) {
    const bundle = await this.fetchBundle(options);
    const items = (bundle.raw.horses || []).map((h) => ({
      number: h.number,
      odds: h.odds,
      popularity: h.popularity,
    }));
    return {
      providerId: this.id,
      items,
      fetchedAt: bundle.fetchedAt,
      latencyMs: bundle.latencyMs,
      status: PROVIDER_STATUS.ONLINE,
    };
  }

  async fetchNews() {
    try {
      const json = await fetchJson("intelligence/news-feed.json");
      return {
        providerId: this.id,
        items: json?.articles || json?.trends || [],
        fetchedAt: new Date().toISOString(),
        status: PROVIDER_STATUS.ONLINE,
      };
    } catch {
      return {
        providerId: this.id,
        items: [],
        fetchedAt: new Date().toISOString(),
        status: PROVIDER_STATUS.ONLINE,
      };
    }
  }

  async fetchMarket(options = {}) {
    const odds = await this.fetchOdds(options);
    return {
      providerId: this.id,
      item: {
        heat: 55,
        sentiment: "neutral",
        overheat: false,
        summary: "Mock市場シグナル（実データ未接続）",
        oddsCount: odds.items.length,
      },
      fetchedAt: odds.fetchedAt,
      status: PROVIDER_STATUS.ONLINE,
    };
  }

  getMeta() {
    return {
      ...super.getMeta(),
      status: PROVIDER_STATUS.ONLINE,
    };
  }
}

async function fetchJson(path) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Mock fetch failed: ${url} (${res.status})`);
  return res.json();
}
