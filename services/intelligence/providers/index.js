/* ========================================
   PAPAPA IQ KEIBA - Intelligence Providers
   Ver5.2 Real Intelligence Connect
   実装可能な同一オリジン取得のみ実装。
   外部スクレイピング / 要APIキーは TODO。
   ======================================== */

import { BaseIntelligenceProvider } from "./base-intelligence-provider.js";
import {
  fetchLocalJson,
  fetchLocalJsonOptional,
} from "../connect/local-feed.js";
import { collectRaces } from "../collectors/race-collector.js";
import {
  collectHorses,
  collectOddsFromHorses,
} from "../collectors/horse-collector.js";
import { collectHistory } from "../collectors/history-collector.js";

/**
 * JRA 公式相当データ（GitHub Pages では同一オリジン JSON スナップショット）
 * 将来: 公式 API / 認可済みフィードへ差替
 */
export class JRAProvider extends BaseIntelligenceProvider {
  constructor() {
    super({
      id: "jra",
      label: "JRA",
      priority: 10,
      enabled: true,
      category: "official",
      implemented: true,
    });
  }

  async fetch(context = {}) {
    if (!this.enabled) return super.fetch(context);

    const started = performance.now();
    try {
      // TODO: Implement JRA official live API when licensed feed is available.
      // Ver5.2: same-origin race/horses + optional history feed
      const [raceFeed, horseFeed, historyFeed] = await Promise.all([
        fetchLocalJson("race.json"),
        fetchLocalJson("horses.json"),
        fetchLocalJsonOptional("intelligence/history-feed.json"),
      ]);

      const raceNumber = Number(context.race?.number || context.raceNumber) || 0;
      const racesRaw = raceFeed.data?.races || [];
      const horsesRaw = horseFeed.data?.entries || [];

      const races = collectRaces(racesRaw, { source: "jra" });
      const horses = collectHorses(horsesRaw, { source: "jra" });

      const selected =
        races.find((r) => r.number === raceNumber) || races[0] || null;
      const raceId = selected
        ? `${selected.date}-${selected.venue}-${selected.number}`
        : "";

      const odds = collectOddsFromHorses(horses, raceId, "jra");

      let history = [];
      if (historyFeed.data?.entries) {
        history = collectHistory(historyFeed.data.entries, { source: "jra" });
      } else {
        history = collectHistory(horsesRaw, { source: "jra" });
      }

      // enrich sexAge / affiliation from optional intelligence overlay
      const overlay = await fetchLocalJsonOptional(
        "intelligence/horse-profile.json"
      );
      if (overlay.data?.entries) {
        const map = new Map(
          overlay.data.entries.map((e) => [Number(e.number), e])
        );
        for (const h of horses) {
          const extra = map.get(Number(h.number));
          if (!extra) continue;
          if (extra.sexAge) h.sexAge = extra.sexAge;
          if (extra.affiliation) h.affiliation = extra.affiliation;
        }
      }

      const items = [...races, ...horses, ...odds, ...history];
      const responseMs = Math.round(performance.now() - started);
      this.markSuccess(items.length, responseMs);

      return {
        items,
        fetchedAt: new Date().toISOString(),
        responseMs,
        note: "local official-shaped snapshot",
      };
    } catch (err) {
      const responseMs = Math.round(performance.now() - started);
      this.markError(err, responseMs);
      throw err;
    }
  }
}

/** TODO: Implement netkeiba (CORS / ToS) */
export class NetkeibaProvider extends BaseIntelligenceProvider {
  constructor() {
    super({
      id: "netkeiba",
      label: "netkeiba",
      priority: 20,
      enabled: true,
      category: "site",
      implemented: false,
    });
  }

  async fetch(context = {}) {
    // TODO: Implement netkeiba
    return super.fetch(context);
  }
}

/** TODO: Implement JBIS (CORS / ToS) */
export class JBISProvider extends BaseIntelligenceProvider {
  constructor() {
    super({
      id: "jbis",
      label: "JBIS",
      priority: 30,
      enabled: true,
      category: "site",
      implemented: false,
    });
  }

  async fetch(context = {}) {
    // TODO: Implement JBIS
    return super.fetch(context);
  }
}

/** TODO: Implement 競馬ラボ */
export class KeibaLabProvider extends BaseIntelligenceProvider {
  constructor() {
    super({
      id: "keibalab",
      label: "競馬ラボ",
      priority: 40,
      enabled: true,
      category: "site",
      implemented: false,
    });
  }

  async fetch(context = {}) {
    // TODO: Implement KeibaLab
    return super.fetch(context);
  }
}

/** TODO: Implement ウマークス */
export class UmaXProvider extends BaseIntelligenceProvider {
  constructor() {
    super({
      id: "umax",
      label: "ウマークス",
      priority: 50,
      enabled: true,
      category: "site",
      implemented: false,
    });
  }

  async fetch(context = {}) {
    // TODO: Implement UmaX
    return super.fetch(context);
  }
}

/** TODO: Implement ウマニティ */
export class UmanityProvider extends BaseIntelligenceProvider {
  constructor() {
    super({
      id: "umanity",
      label: "ウマニティ",
      priority: 60,
      enabled: true,
      category: "site",
      implemented: false,
    });
  }

  async fetch(context = {}) {
    // TODO: Implement Umanity
    return super.fetch(context);
  }
}

/**
 * ニュース（同一オリジン news-feed.json）
 * TODO: Implement News Parser for live RSS / publisher APIs
 */
export class NewsProvider extends BaseIntelligenceProvider {
  constructor() {
    super({
      id: "news",
      label: "ニュース",
      priority: 70,
      enabled: true,
      category: "news",
      implemented: true,
    });
  }

  async fetch(context = {}) {
    if (!this.enabled) return super.fetch(context);
    const started = performance.now();
    try {
      const feed = await fetchLocalJson("intelligence/news-feed.json");
      const articles = Array.isArray(feed.data?.articles)
        ? feed.data.articles
        : [];
      const items = articles.map((a) => ({
        type: "news",
        id: a.id || "",
        title: a.title || "",
        body: a.body || "",
        url: a.url || "",
        publishedAt: a.publishedAt || null,
        category: a.category || "競馬ニュース",
        source: "news",
        aiOnly: true,
      }));

      // optional comment/trend seeds for AI input (not displayed)
      for (const c of feed.data?.comments || []) {
        items.push({ type: "comment", ...c, source: "news", aiOnly: true });
      }
      for (const t of feed.data?.trends || []) {
        items.push({ type: "trend", ...t, source: "news", aiOnly: true });
      }

      const responseMs = Math.round(performance.now() - started);
      this.markSuccess(items.length, responseMs);
      return {
        items,
        fetchedAt: new Date().toISOString(),
        responseMs,
        note: "local news feed",
      };
    } catch (err) {
      const responseMs = Math.round(performance.now() - started);
      this.markError(err, responseMs);
      throw err;
    }
  }
}

/** TODO: Implement X API */
export class XProvider extends BaseIntelligenceProvider {
  constructor() {
    super({
      id: "x",
      label: "X",
      priority: 80,
      enabled: true,
      category: "sns",
      implemented: false,
    });
  }

  async fetch(context = {}) {
    // TODO: Implement X API
    return super.fetch(context);
  }
}

/** TODO: Implement Youtube Analyzer */
export class YoutubeProvider extends BaseIntelligenceProvider {
  constructor() {
    super({
      id: "youtube",
      label: "YouTube",
      priority: 90,
      enabled: true,
      category: "media",
      implemented: false,
    });
  }

  async fetch(context = {}) {
    // TODO: Implement Youtube Analyzer
    return super.fetch(context);
  }
}

export function createDefaultProviders() {
  return [
    new JRAProvider(),
    new NetkeibaProvider(),
    new JBISProvider(),
    new KeibaLabProvider(),
    new UmaXProvider(),
    new UmanityProvider(),
    new NewsProvider(),
    new XProvider(),
    new YoutubeProvider(),
  ];
}
