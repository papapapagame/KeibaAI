/* ========================================
   PAPAPA IQ KEIBA - AI Intelligence Layer
   Ver5.2 Real Intelligence Connect
   ※ 既存 ai-engine / thinking-engine は変更しない
   ======================================== */

import { collectIntelligence } from "./intelligence-manager.js";
import { buildXSearchQueries, prepareXSignalsForAi } from "./x-analysis.js";
import { buildNewsFetchPlan, prepareNewsForAi } from "./news-analysis.js";
import { createAnalysis } from "./models.js";

/**
 * 複数情報源を統合し、AI入力用パケットと独自指標を生成
 */
export async function buildIntelligencePacket(context = {}) {
  const collected = await collectIntelligence(context);

  const race = context.race || {};
  const horses = Array.isArray(context.horses) ? context.horses : [];

  const xPlan = buildXSearchQueries({
    raceName: race.name || "",
    horseNames: horses.map((h) => h.name || h.horse).filter(Boolean),
    jockeyNames: horses.map((h) => h.jockey).filter(Boolean),
    trainerNames: horses.map((h) => h.trainer).filter(Boolean),
  });

  const newsPlan = buildNewsFetchPlan();
  const newsPackets = prepareNewsForAi(collected.normalized?.news || []);
  const xSignals = prepareXSignalsForAi([]);

  const fusedInput = {
    official: filterByCategory(collected.providers, "official"),
    sites: filterByCategory(collected.providers, "site"),
    sns: filterByCategory(collected.providers, "sns"),
    news: filterByCategory(collected.providers, "news"),
    media: filterByCategory(collected.providers, "media"),
    normalized: collected.normalized,
    aiInput: collected.aiInput,
    xPlan,
    newsPlan,
    newsPackets,
    xSignals,
    aiOnly: true,
  };

  const scores = buildDummyScores(race, horses, collected);
  const analysis = createAnalysis({
    raceId: race.id || `${race.date || ""}-${race.number || ""}`,
    summary: "Real Intelligence Connect — fused AI input packet",
    scores,
    signals: [],
    sources: collected.providers.map((p) => p.providerId),
  });

  return {
    collectedAt: collected.collectedAt,
    providers: collected.providers,
    monitor: collected.monitor,
    validations: collected.validations,
    validationSummary: collected.validationSummary,
    logs: collected.logs,
    debug: collected.debug,
    fusedInput,
    analysis,
    scores,
    marketSentiment: scores.marketSentiment,
  };
}

/**
 * 独自 AI 指標（表示用）。既存評価ロジックには接続しない。
 */
export function buildDummyScores(race = {}, horses = [], collected = {}) {
  const n = Array.isArray(horses) ? horses.length : 0;
  const connected = (collected.providers || []).filter(
    (p) => p.status === "ONLINE" || p.count > 0
  ).length;
  const seed =
    (Number(race.number) || 1) * 17 +
    n * 3 +
    connected * 11 +
    (collected.providers?.length || 0);

  const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

  return {
    iqScore: clamp(62 + (seed % 28) + connected),
    paceScore: clamp(55 + ((seed * 3) % 35)),
    valueScore: clamp(48 + ((seed * 5) % 40)),
    trustScore: clamp(58 + ((seed * 7) % 30) + connected * 2),
    dangerScore: clamp(25 + ((seed * 11) % 45)),
    trendScore: clamp(50 + ((seed * 13) % 38)),
    buzzScore: clamp(40 + ((seed * 17) % 42)),
    supportScore: clamp(52 + ((seed * 19) % 36)),
    riskScore: clamp(30 + ((seed * 23) % 50)),
    marketSentiment: sentimentLabel(seed),
  };
}

function sentimentLabel(seed) {
  const labels = ["強気", "やや強気", "中立", "やや弱気", "弱気"];
  return labels[Math.abs(seed) % labels.length];
}

function filterByCategory(providerResults, category) {
  const map = {
    official: ["jra"],
    site: ["netkeiba", "jbis", "keibalab", "umax", "umanity"],
    sns: ["x"],
    news: ["news"],
    media: ["youtube"],
  };
  const ids = map[category] || [];
  return (providerResults || []).filter((p) => ids.includes(p.providerId));
}
