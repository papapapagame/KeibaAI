/* ========================================
   Provider Integration — Ver10.6
   全 Real Provider の統一管理確認（新機能なし）
   ======================================== */

import { ensureRegistry, listRegistryMetas } from "../provider/provider-registry.js";
import {
  REAL_RACE_PROVIDER_ID,
} from "../provider/race/real-race-provider.js";
import {
  REAL_HORSE_PROVIDER_ID,
} from "../provider/horse/real-horse-provider.js";
import {
  REAL_ODDS_PROVIDER_ID,
} from "../provider/odds/real-odds-provider.js";
import {
  REAL_WEATHER_PROVIDER_ID,
} from "../provider/weather/real-weather-provider.js";
import {
  REAL_NEWS_PROVIDER_ID,
} from "../provider/news/real-news-provider.js";
import {
  REAL_SOCIAL_PROVIDER_ID,
} from "../provider/social/real-social-provider.js";

export const PROVIDER_INTEGRATION_VERSION = "10.6.0";

export const INTEGRATED_REAL_PROVIDER_IDS = [
  REAL_RACE_PROVIDER_ID,
  REAL_HORSE_PROVIDER_ID,
  REAL_ODDS_PROVIDER_ID,
  REAL_WEATHER_PROVIDER_ID,
  REAL_NEWS_PROVIDER_ID,
  REAL_SOCIAL_PROVIDER_ID,
];

const REAL_LABELS = {
  [REAL_RACE_PROVIDER_ID]: "Race",
  [REAL_HORSE_PROVIDER_ID]: "Horse",
  [REAL_ODDS_PROVIDER_ID]: "Odds",
  [REAL_WEATHER_PROVIDER_ID]: "Weather",
  [REAL_NEWS_PROVIDER_ID]: "News",
  [REAL_SOCIAL_PROVIDER_ID]: "Social",
};

/**
 * ProviderManager 経由で Real / Mock が登録・有効化されているか検証
 */
export function getProviderIntegrationReport() {
  ensureRegistry();
  const metas = listRegistryMetas() || [];
  const byId = new Map(metas.map((m) => [m.id, m]));

  const mock = byId.get("mock") || null;
  const realProviders = INTEGRATED_REAL_PROVIDER_IDS.map((id) => {
    const meta = byId.get(id);
    return {
      id,
      label: REAL_LABELS[id] || id,
      registered: Boolean(meta),
      enabled: Boolean(meta?.enabled),
      implemented: Boolean(meta?.implemented),
      health: meta?.health || "UNKNOWN",
      version: meta?.version || null,
    };
  });

  const allRegistered = realProviders.every((p) => p.registered);
  const allEnabled = realProviders.every((p) => p.enabled);
  const mockKept = Boolean(mock);

  return {
    version: PROVIDER_INTEGRATION_VERSION,
    mockKept,
    mockEnabled: Boolean(mock?.enabled),
    realProviders,
    registeredCount: realProviders.filter((p) => p.registered).length,
    enabledCount: realProviders.filter((p) => p.enabled).length,
    expectedCount: INTEGRATED_REAL_PROVIDER_IDS.length,
    ok: allRegistered && allEnabled && mockKept,
    flow: [
      "Provider",
      "Fetcher",
      "Parser",
      "Normalizer",
      "Validator",
      "Unified Model",
      "AI Engine",
      "Discussion",
      "Explainability",
      "Knowledge Graph",
    ],
    note: allRegistered && allEnabled && mockKept
      ? "全 Real Provider 統合完了 / Mock 維持"
      : "Provider 統合に不足あり",
  };
}

export const ProviderIntegration = {
  report: getProviderIntegrationReport,
  ids: INTEGRATED_REAL_PROVIDER_IDS,
  version: PROVIDER_INTEGRATION_VERSION,
};
