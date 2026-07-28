/* ========================================
   PAPAPA IQ KEIBA - analysis.js
   Ver5.5.0 Learning AI Engine 連携（表示層）
   既存 ai-engine.js / thinking-engine.js は変更しない
   ======================================== */

import { analyzeRace } from "./ai-engine.js";
import { saveLastPrediction } from "./learning-engine.js";
import { initAiDebateMode } from "./ai-debate.js";
import { initV5Extras } from "./v5-extras.js";
import {
  clearDataCache,
  formatUpdateTime,
  getDataStatus,
} from "../services/data-provider.js";
import {
  clearPlatformCache,
  getSourceMode,
  setSourceMode,
} from "../services/data/index.js";
import { loadRaceForAi } from "../services/race/index.js";
import { confidenceFromCompleteness } from "../services/race/data-completeness.js";
import {
  getFrameworkDashboard,
  refreshProviderHealth,
} from "../services/provider/index.js";
import {
  connectRaceData,
  findConnectedRace,
  getRaceConnectStatus,
} from "../services/race-connect/index.js";
import {
  loadEntriesForAi,
  filterEntriesForStage,
  entryToHorseModel,
  getEntryDashboard,
  getEntryMode,
  setEntryMode,
} from "../services/entry/index.js";
import {
  loadDrawForAi,
  mergeHorsesWithDraw,
  getDrawDashboard,
  applyDrawScoreAdjustments,
} from "../services/draw/index.js";
import {
  loadOddsForAi,
  mergeHorsesWithOdds,
  getOddsDashboard,
  applyOddsMarketAdjustments,
  getOddsMode,
  setOddsMode,
} from "../services/odds/index.js";
import {
  loadWeatherForAi,
  mergeRaceWithWeather,
  getWeatherDashboard,
  applyWeatherTrackAdjustments,
} from "../services/weather/index.js";
import {
  loadNewsForAi,
  mergeHorsesWithNews,
  getNewsDashboard,
  applyNewsScoreAdjustments,
} from "../services/news/index.js";
import {
  loadSocialForAi,
  mergeHorsesWithSocial,
  getSocialDashboard,
  applySocialScoreAdjustments,
} from "../services/social/index.js";
import {
  loadDiscussionForAi,
  getDiscussionDashboard,
  applyDiscussionScoreAdjustments,
} from "../services/discussion/index.js";
import {
  loadExplainForAi,
  getExplainDashboard,
} from "../services/explain/index.js";
import {
  loadKnowledgeGraphForAi,
  getKnowledgeDashboard,
  enrichEngineContext,
  getKnowledgeQuery,
} from "../services/knowledge/index.js";
import { toLegacyHorse } from "../services/models/unified.js";
import {
  getCalendarDashboard,
  getRaceAnalysisContext,
  prepareAiInput,
  getCalendarMode,
} from "../services/calendar/index.js";
import {
  startSmartUpdateEngine,
  getUpdateStatus,
  setAutoUpdate,
  getAutoUpdate,
  fireMockEvent,
  tickSchedule,
  notifyStageChange,
  AnalysisTrigger,
  listMockEventTypes,
} from "../services/update/index.js";
import {
  buildIntelligencePacket,
  clearAllIntelligenceState,
  clearProviderCache,
  getDebugSnapshot,
  getProviderMetas,
  initIntelligenceManager,
} from "../services/intelligence/index.js";
import { runIntelligenceEngine } from "../services/ai/index.js";
import { runMarketEngine } from "../services/market/index.js";
import { recordPrediction } from "../services/learning/index.js";
import {
  DEBUG,
  DEBUG_MODE,
  BUILD_DATE,
  BUILD_NUMBER,
  RELEASE_CHANNEL,
  VERSION,
  getBuildInfo,
} from "./config.js";
import {
  guardAsync,
  guardSync,
  getErrorStats,
} from "../services/runtime/service-guard.js";
import {
  appendLines,
  applyCardStagger,
  clearElement,
  createElement,
  createTableRow,
  getSearchParams,
  navigateWithFade,
} from "./utils.js";

const GOLD = "#e8d48b";
const GOLD_DIM = "rgba(201, 162, 39, 0.28)";
const GOLD_FILL = "rgba(201, 162, 39, 0.32)";

const TICKET_TYPES = ["単勝", "馬連", "ワイド", "三連複", "三連単"];
const STRATEGY_UI = [
  { label: "本命", key: "本命型" },
  { label: "穴", key: "高配当型" },
  { label: "バランス", key: "バランス型" },
  { label: "AIおすすめ", key: "AIおすすめ" },
];

const MARK_CLASS = {
  "◎": "honmei",
  "○": "taikou",
  "〇": "taikou",
  "▲": "ana",
  "△": "ren",
  "☆": "hoshi",
  "×": "x",
};

const RADAR5_LABELS = ["スピード", "先行力", "瞬発力", "持久力", "安定感"];
const VENUES = ["東京", "中山", "阪神"];
const CONDITIONS = ["良", "稍重", "重", "不良"];

const ABILITY_KEYS = [
  ["speed", "スピード", "gold"],
  ["stamina", "スタミナ", "blue"],
  ["burst", "瞬発力", "green"],
  ["pace", "展開", "gold"],
  ["track", "馬場", "blue"],
  ["distance", "距離", "green"],
];

const CONF_RING_CIRC = 2 * Math.PI * 68;
const GAUGE_LEN = 251.2;

let selectedTicketType = "三連複";
let selectedStrategy = "AIおすすめ";
let cachedTickets = null;
let sequenceStarted = false;
let debateContext = { reports: [], result: {}, race: {} };

export async function initAnalysisPage() {
  const perfStarted = typeof performance !== "undefined" ? performance.now() : Date.now();
  const params = getSearchParams();
  const detailParams = new URLSearchParams({
    date: params.get("date") || "",
    venue: params.get("venue") || "",
    venueLabel: params.get("venueLabel") || "",
    race: params.get("race") || "",
    name: params.get("name") || "",
    time: params.get("time") || "",
    grade: params.get("grade") || "",
  });

  const raceNumber = Number(params.get("race") || 0);
  const forceError = params.get("forceError") === "1";

  // Ver7.5 Race Data Connect（Horse/Odds 対象外）→ Calendar 同期
  const raceConnect = await connectRaceData({
    forceError,
    emitUpdate: false,
    silent: true,
  });
  bindRaceConnectStatusUi(raceConnect);

  const bundle = await loadRaceForAi({
    raceNumber,
    forceError,
    stage: params.get("stage") != null ? Number(params.get("stage")) : undefined,
  });

  bindDataStatusUi(bundle.status);
  bindIntegrationDataUi(bundle);
  bindDataErrorUi(bundle, raceNumber);
  bindRaceConnectDevUi(raceConnect);

  const connectedRace = findConnectedRace(raceConnect.races, {
    date: params.get("date") || "",
    venueId: params.get("venue") || "",
    raceNumber,
  });

  const race =
    bundle.legacy?.race ||
    {
      date: params.get("date") || "",
      venue: params.get("venue") || "",
      venueLabel: params.get("venueLabel") || "",
      number: raceNumber,
      name: params.get("name") || "",
      time: params.get("time") || "",
    };

  // Race Connect の開催メタを Unified 側へ反映（評価ロジック非改変）
  if (connectedRace) {
    Object.assign(race, {
      date: connectedRace.date || race.date,
      venue: connectedRace.venueId || race.venue,
      venueLabel: connectedRace.venueLabel || race.venueLabel,
      kai: connectedRace.kai,
      day: connectedRace.day,
      name: connectedRace.raceName || race.name,
      time: connectedRace.startTime || race.time,
      distance: connectedRace.distanceMeters || race.distance,
      track: connectedRace.surface || race.track,
      courseDirection: connectedRace.courseDirection || race.courseDirection,
      courseLoop: connectedRace.courseLoop || race.courseLoop,
      weather: connectedRace.weather || race.weather,
      trackCondition: connectedRace.trackCondition || race.trackCondition,
      grade: connectedRace.grade || race.grade,
      raceClass: connectedRace.raceClass || race.raceClass,
      prize: connectedRace.prize || race.prize,
    });
  }

  const horses = bundle.legacy?.horses || [];
  const settingsData = bundle.legacy?.settings || {};

  bindDeveloperPanel(bundle, null, null);

  if (!bundle.ok || !horses.length) {
    const msg = bundle.blocked
      ? "Provider未接続です。Developer Panel で Data Source を Mock に戻してください。"
      : bundle.message || bundle.status?.error || "データ取得に失敗しました。キャッシュ表示を確認してください。";
    if (DEBUG) console.error("[analysis] data platform:", msg);
    setText("data-source-label", bundle.status?.sourceLabel || "Error");
    setText("data-error-detail", msg);
    document.getElementById("data-error-banner")?.classList.add("is-visible");
    document.getElementById("data-error-banner")?.removeAttribute("hidden");
    bindReleaseRcUi({
      analysisMs: Math.round(
        (typeof performance !== "undefined" ? performance.now() : Date.now()) -
          perfStarted
      ),
    });
    return;
  }

  // Ver7.1 Analysis Stage（Unified Calendar Model 経由）
  const cal = await getCalendarDashboard({ mode: getCalendarMode() });
  const stageParam = params.get("stage");
  const raceCtx = getRaceAnalysisContext({
    meetings: cal.meetings || [],
    raceStages: cal.raceStages || {},
    date: params.get("date") || race.date || "",
    venueId: params.get("venue") || race.venue || "",
    raceNumber: raceNumber || race.number,
  });
  if (stageParam !== "" && stageParam != null && Number.isFinite(Number(stageParam))) {
    // URL 明示 Stage を優先
    const forced = Number(stageParam);
    Object.assign(
      raceCtx,
      getRaceAnalysisContext({
        meetings: cal.meetings || [],
        raceStages: {
          ...(cal.raceStages || {}),
          [`${params.get("date")}|${params.get("venue")}|${raceNumber}`]: forced,
        },
        date: params.get("date") || "",
        venueId: params.get("venue") || "",
        raceNumber,
      })
    );
  }
  bindAnalysisStageUi(raceCtx);
  bindRealRaceCalendarUi(cal);
  if (cal?.calendar && race && typeof race === "object") {
    race.calendar = cal.calendar;
    race.schedules = cal.schedules || [];
  }

  const stageNow = raceCtx.analysisStage?.stage ?? 0;
  const confidenceNow = raceCtx.confidence?.percent ?? null;
  const completenessNow = raceCtx.completeness?.percent ?? null;

  // Ver7.6 Horse Entry — Stage に応じた登録馬
  const entryBundle = await loadEngineSafe(
    "entry",
    () =>
      loadEntriesForAi({
        stage: stageNow,
        date: params.get("date") || race.date || "",
        venueId: params.get("venue") || race.venue || "",
        raceNumber: raceNumber || race.number,
        emitUpdate: false,
        silent: true,
      }),
    { ok: false, entries: [], message: "出馬表を取得できませんでした", userMessage: "出馬表を取得できませんでした" }
  );
  bindEntryStatusUi(entryBundle);
  bindEntryAiPanel(entryBundle);
  bindEntryDevUi(entryBundle);
  if (entryBundle?.unified && race && typeof race === "object") {
    race.entries = entryBundle.unified;
    race.entryProvider = {
      kind: entryBundle.providerKind || entryBundle.mode || "mock",
      providerId: entryBundle.providerId || null,
      updatedAt: entryBundle.fetchedAt || null,
    };
  }

  // Ver7.7 Draw & Jockey — 枠順・騎手・斤量（確定のみ）
  const drawBundle = await loadEngineSafe(
    "draw",
    () =>
      loadDrawForAi({
        stage: stageNow,
        date: params.get("date") || race.date || "",
        venueId: params.get("venue") || race.venue || "",
        raceNumber: raceNumber || race.number,
        emitUpdate: false,
        silent: true,
        baseConfidence: entryBundle?.confidenceHint ?? confidenceNow ?? 72,
      }),
    { ok: false, message: "Draw 取得失敗" }
  );

  // Ver7.8 Odds & Market — オッズ・人気・市場（Stage6+）
  const oddsBundle = await loadEngineSafe(
    "odds",
    () =>
      loadOddsForAi({
        stage: Math.max(stageNow, Number(drawBundle?.confirmedStage) || 0),
        date: params.get("date") || race.date || "",
        venueId: params.get("venue") || race.venue || "",
        raceNumber: raceNumber || race.number,
        emitUpdate: false,
        silent: true,
        baseConfidence:
          drawBundle?.confidenceHint ?? entryBundle?.confidenceHint ?? 78,
      }),
    { ok: false, message: "オッズ情報を取得できませんでした", userMessage: "オッズ情報を取得できませんでした" }
  );

  // Ver7.9 Weather & Track — 天候・馬場・風（Stage6+）
  const weatherBundle = await loadEngineSafe(
    "weather",
    () =>
      loadWeatherForAi({
        stage: Math.max(
          stageNow,
          Number(drawBundle?.confirmedStage) || 0,
          Number(oddsBundle?.confirmedStage) || 0
        ),
        date: params.get("date") || race.date || "",
        venueId: params.get("venue") || race.venue || "",
        raceNumber: raceNumber || race.number,
        emitUpdate: false,
        silent: true,
        baseConfidence:
          oddsBundle?.confidenceHint ??
          drawBundle?.confidenceHint ??
          entryBundle?.confidenceHint ??
          82,
      }),
    { ok: false, message: "Weather 取得失敗" }
  );

  // Ver8.0 News Intelligence — 構造化メタデータのみ（本文なし）
  const newsBundle = await loadEngineSafe(
    "news",
    () =>
      loadNewsForAi({
        date: params.get("date") || race.date || "",
        venueId: params.get("venue") || race.venue || "",
        raceNumber: raceNumber || race.number,
        emitUpdate: false,
        silent: true,
        baseConfidence:
          weatherBundle?.confidenceHint ??
          oddsBundle?.confidenceHint ??
          86,
      }),
    { ok: false, items: [], message: "News 取得失敗" }
  );

  // Ver8.1 Social Intelligence — 構造化メタデータのみ（投稿本文なし）
  const socialBundle = await loadEngineSafe(
    "social",
    () =>
      loadSocialForAi({
        date: params.get("date") || race.date || "",
        venueId: params.get("venue") || race.venue || "",
        raceNumber: raceNumber || race.number,
        emitUpdate: false,
        silent: true,
        baseConfidence:
          newsBundle?.confidenceHint ??
          weatherBundle?.confidenceHint ??
          86,
      }),
    { ok: false, items: [], trends: null, message: "Social 取得失敗" }
  );

  const effectiveStage = Math.max(
    stageNow,
    Number(drawBundle?.confirmedStage) || 0,
    Number(oddsBundle?.confirmedStage) || 0,
    Number(weatherBundle?.confirmedStage) || 0
  );
  bindDrawStatusUi(drawBundle);
  bindDrawAiPanel(drawBundle, effectiveStage);
  bindDrawDevUi(drawBundle);
  bindOddsStatusUi(oddsBundle);
  bindOddsAiPanel(oddsBundle, effectiveStage);
  bindOddsDevUi(oddsBundle);
  if (oddsBundle?.unified && race && typeof race === "object") {
    race.oddsEntries = oddsBundle.unified;
    race.marketStatus = oddsBundle.marketStatus || null;
    race.oddsProvider = {
      kind: oddsBundle.providerKind || oddsBundle.mode || "mock",
      providerId: oddsBundle.providerId || null,
      updatedAt: oddsBundle.fetchedAt || null,
    };
  }
  bindWeatherStatusUi(weatherBundle);
  bindWeatherAiPanel(weatherBundle, effectiveStage);
  bindWeatherDevUi(weatherBundle);
  bindNewsStatusUi(newsBundle);
  bindNewsDevUi(newsBundle);
  bindSocialStatusUi(socialBundle);
  bindSocialDevUi(socialBundle);

  // Completeness / Confidence（News/Social は補助。Weather>Odds>Draw>Entry を基本）
  const confHint =
    socialBundle?.ok && socialBundle.confidenceHint != null
      ? Math.round(
          ((newsBundle?.confidenceHint ??
            weatherBundle?.confidenceHint ??
            86) +
            socialBundle.confidenceHint) /
            2
        )
      : newsBundle?.ok && newsBundle.confidenceHint != null
        ? Math.round(
            ((weatherBundle?.confidenceHint ??
              oddsBundle?.confidenceHint ??
              86) +
              newsBundle.confidenceHint) /
              2
          )
        : weatherBundle?.ok && weatherBundle.confidenceHint != null
          ? weatherBundle.confidenceHint
          : oddsBundle?.ok && oddsBundle.confidenceHint != null
            ? oddsBundle.confidenceHint
            : drawBundle?.ok && drawBundle.confidenceHint != null
              ? drawBundle.confidenceHint
              : entryBundle?.confidenceHint;
  if (confHint != null) {
    const confEl = document.getElementById("stage-confidence");
    if (confEl) confEl.textContent = `${confHint}%`;
  }
  const completenessPct =
    weatherBundle?.ok && weatherBundle.weatherCompleteness?.overall != null
      ? weatherBundle.weatherCompleteness.overall
      : oddsBundle?.ok && oddsBundle.oddsCompleteness?.overall != null
        ? oddsBundle.oddsCompleteness.overall
        : drawBundle?.ok && drawBundle.drawCompleteness?.overall != null
          ? drawBundle.drawCompleteness.overall
          : null;
  if (completenessPct != null) {
    setText("stage-completeness", `${completenessPct}%`);
  }
  // Weather Completeness のニュース／SNS欄を更新
  if (newsBundle?.ok && newsBundle.newsCompleteness?.news != null) {
    setText("wc-news", `${newsBundle.newsCompleteness.news}%`);
  }
  if (socialBundle?.ok && socialBundle.socialCompleteness?.sns != null) {
    setText("wc-sns", `${socialBundle.socialCompleteness.sns}%`);
    setText("oc-sns", `${socialBundle.socialCompleteness.sns}%`);
  }
  if (effectiveStage !== stageNow) {
    setText("stage-current", `Stage${effectiveStage}`);
  }

  const horsesWithEntry = mergeHorsesWithEntries(horses, entryBundle.entries);
  const entryFiltered = filterEntriesForStage(
    entryBundle.entries || [],
    effectiveStage
  );
  const entryLegacy =
    entryFiltered.length > 0
      ? entryFiltered.map((e) =>
          toLegacyHorse(entryToHorseModel(e, effectiveStage))
        )
      : horsesWithEntry;

  const drawMerged = mergeHorsesWithDraw(
    entryLegacy,
    drawBundle,
    effectiveStage
  );
  const oddsMerged = mergeHorsesWithOdds(
    drawMerged,
    oddsBundle,
    effectiveStage
  );
  const newsMerged = mergeHorsesWithNews(oddsMerged, newsBundle);
  const socialMerged = mergeHorsesWithSocial(newsMerged, socialBundle);

  const raceWithWeather = mergeRaceWithWeather(
    {
      ...race,
      date: params.get("date") || race.date,
      venue: params.get("venue") || race.venue,
      venueLabel: params.get("venueLabel") || race.venueLabel,
      number: raceNumber || race.number,
      news: newsBundle?.unified || [],
      social: socialBundle?.unified || null,
    },
    weatherBundle,
    effectiveStage
  );

  const prepared = prepareAiInput(
    raceWithWeather,
    socialMerged,
    effectiveStage
  );
  const stagedRace = prepared.race;
  const stagedHorses = prepared.horses;

  initIntelligenceManager();
  const intelPacket = await buildIntelligencePacket({
    race: stagedRace,
    horses: stagedHorses,
    forceRefresh: false,
  });

  // Ver10.0: Unified Calendar / Schedule を AI 入力へ（AIエンジン非改変）
  if (cal?.calendar) {
    try {
      const aiInput =
        intelPacket.fusedInput?.aiInput ||
        intelPacket.aiInput ||
        null;
      if (aiInput && typeof aiInput === "object") {
        aiInput.calendar = cal.calendar;
        aiInput.schedules = cal.schedules || [];
        aiInput.calendarProvider = {
          kind: cal.providerKind || cal.mode || "mock",
          providerId: cal.providerId || null,
          updatedAt: cal.updatedAt || null,
        };
      }
    } catch {
      /* calendar inject must not break analysis */
    }
  }

  // Ver8.0: 構造化ニュースのみ Intelligence / Market へ渡す（本文なし）
  if (newsBundle?.ok && Array.isArray(newsBundle.aiNews)) {
    try {
      const aiInput =
        intelPacket.fusedInput?.aiInput ||
        intelPacket.aiInput ||
        null;
      if (aiInput && typeof aiInput === "object") {
        aiInput.news = newsBundle.aiNews;
      }
      if (intelPacket.fusedInput && typeof intelPacket.fusedInput === "object") {
        intelPacket.fusedInput.newsMeta = {
          count: newsBundle.count,
          important: newsBundle.stats?.important,
          reflect: newsBundle.aiReflect,
        };
      }
    } catch {
      /* news inject must not break analysis */
    }
  }

  // Ver8.1: 構造化 SNS メタのみ Intelligence / Market へ渡す（投稿本文なし）
  if (socialBundle?.ok && socialBundle.aiSocial) {
    try {
      const aiInput =
        intelPacket.fusedInput?.aiInput ||
        intelPacket.aiInput ||
        null;
      if (aiInput && typeof aiInput === "object") {
        aiInput.social = socialBundle.aiSocial;
      }
      if (intelPacket.fusedInput && typeof intelPacket.fusedInput === "object") {
        intelPacket.fusedInput.socialMeta = {
          count: socialBundle.count,
          trend: socialBundle.stats?.trendScore,
          topCategories: socialBundle.stats?.topCategories,
          reflect: socialBundle.aiReflect,
        };
      }
    } catch {
      /* social inject must not break analysis */
    }
  }

  // レース情報を Intelligence 側で補完（距離・馬場など）
  const intelRace =
    (intelPacket.fusedInput?.aiInput?.races || []).find(
      (r) => Number(r.number) === Number(stagedRace.number)
    ) || (intelPacket.fusedInput?.aiInput?.races || [])[0];
  const raceForEngine = {
    ...stagedRace,
    distance: stagedRace.distance || intelRace?.distance || 1600,
    track: stagedRace.track || intelRace?.track || "芝",
    trackCondition:
      stagedRace.trackCondition ||
      intelRace?.condition ||
      stagedRace.condition ||
      "良",
    weather: stagedRace.weather || intelRace?.weather || "",
    grade: stagedRace.grade || intelRace?.grade || "",
    temperature: stagedRace.temperature,
    humidity: stagedRace.humidity,
    windSpeed: stagedRace.windSpeed,
    windDirection: stagedRace.windDirection,
    moisture: stagedRace.moisture,
    weatherConfirmed: Boolean(stagedRace.weatherConfirmed),
    trackConfirmed: Boolean(stagedRace.trackConfirmed),
    trackScore: stagedRace.trackScore,
    weatherScore: stagedRace.weatherScore,
    surfaceScore: stagedRace.surfaceScore,
    weatherAdjustments: stagedRace.weatherAdjustments || [],
  };

  // Ver5.3: 取得データを統合解析（既存 ai-engine とは独立）
  const engineResult = runIntelligenceEngine({
    race: raceForEngine,
    horses: stagedHorses,
    intelPacket,
  });

  // Ver5.4: 市場心理分析 → Final IQ（本文・投稿は非表示）
  const marketResult = runMarketEngine({
    race: raceForEngine,
    horses: stagedHorses,
    intelPacket,
    engineResult,
  });

  // Ver8.2 AI Discussion Engine — Evidence比較・矛盾解決・合意形成
  const discussionBundle =
    guardSync(
      "Discussion",
      () =>
        loadDiscussionForAi({
          race: raceForEngine,
          horses: stagedHorses,
          entryBundle,
          drawBundle,
          oddsBundle,
          weatherBundle,
          newsBundle,
          socialBundle,
          intelPacket,
          marketResult,
          engineResult,
          fetchedAt: new Date().toISOString(),
        }),
      { ok: false, status: "error", count: 0 },
      "Discussion の解析に失敗しました。他の分析結果は表示を継続します。"
    ).data || { ok: false, status: "error", count: 0 };

  if (discussionBundle?.ok && discussionBundle.aiDiscussion) {
    try {
      const aiInput =
        intelPacket.fusedInput?.aiInput ||
        intelPacket.aiInput ||
        null;
      if (aiInput && typeof aiInput === "object") {
        aiInput.discussion = discussionBundle.aiDiscussion;
      }
      if (intelPacket.fusedInput && typeof intelPacket.fusedInput === "object") {
        intelPacket.fusedInput.discussionMeta = {
          evidenceCount: discussionBundle.count,
          consensus: discussionBundle.consensus?.consensusScore,
          conflict: discussionBundle.consensus?.conflictScore,
          finalConfidence: discussionBundle.consensus?.finalConfidence,
          status: discussionBundle.status,
        };
      }
      if (raceForEngine && typeof raceForEngine === "object") {
        raceForEngine.discussion = discussionBundle.unified || null;
      }
    } catch {
      /* discussion inject must not break analysis */
    }
  }

  bindIntelligenceScores(engineResult.scores, marketResult);
  bindIntelligenceEngineUi(engineResult);
  bindMarketIntelligenceUi(marketResult);
  bindDiscussionStatusUi(discussionBundle);
  bindDiscussionDevUi(discussionBundle);
  bindDeveloperPanel(bundle, intelPacket, marketResult);
  bindSmartUpdateDevControls();
  bindRaceConnectDevUi(raceConnect);

  // Discussion Final Confidence を Stage Confidence へ反映（補助）
  if (
    discussionBundle?.ok &&
    discussionBundle.consensus?.finalConfidence != null
  ) {
    const blended = Math.round(
      ((confHint ?? 80) + discussionBundle.consensus.finalConfidence) / 2
    );
    const confEl = document.getElementById("stage-confidence");
    if (confEl) confEl.textContent = `${blended}%`;
  }

  // Ver7.2 Smart Update Engine（AI本体は変更せず、必要時のみ再分析トリガ）
  const snapshotBase = AnalysisTrigger.buildSnapshot({
    race: stagedRace,
    horses: stagedHorses,
    stage: effectiveStage,
  });
  AnalysisTrigger.setBaseline(snapshotBase);

  startSmartUpdateEngine({
    contextProvider: () => ({
      isMeetingDay: Boolean(params.get("date")),
      raceStartAt: null,
      stage: effectiveStage,
      confidence: confHint ?? confidenceNow,
      completeness:
        weatherBundle?.weatherCompleteness?.overall ??
        oddsBundle?.oddsCompleteness?.overall ??
        drawBundle?.drawCompleteness?.overall ??
        completenessNow,
      snapshot: AnalysisTrigger.buildSnapshot({
        race: stagedRace,
        horses: stagedHorses,
        stage: effectiveStage,
      }),
    }),
    analysisHandler: async (job) => {
      setText("ai-update-reason", job.reason || "再分析しました。");
      bindUpdateStatusUi();
      return {
        confidence: confHint ?? confidenceNow,
        completeness:
          weatherBundle?.weatherCompleteness?.overall ??
          oddsBundle?.oddsCompleteness?.overall ??
          drawBundle?.drawCompleteness?.overall ??
          completenessNow,
        stage: effectiveStage,
      };
    },
  });

  // Stage 変化連携
  try {
    const prevKey = "papapa_iq_last_stage_v72";
    const rawPrev = sessionStorage.getItem(prevKey);
    if (rawPrev != null) {
      const prev = Number(rawPrev);
      if (Number.isFinite(prev) && prev !== effectiveStage) {
        notifyStageChange(prev, effectiveStage);
      }
    }
    sessionStorage.setItem(prevKey, String(effectiveStage));
  } catch {
    /* ignore */
  }

  bindUpdateStatusUi();
  setText("ai-update-reason", "初回分析です。");

  if (!stagedHorses.length && effectiveStage < 1) {
    // Stage0 は開催情報のみ — AIエンジンは空馬で呼ばず通知のみ
    setText(
      "stage-provisional",
      "開催情報のみの段階のため、馬評価はまだ行いません（暫定）。"
    );
    return;
  }

  if (!stagedHorses.length) {
    document.getElementById("data-error-banner")?.classList.add("is-visible");
    return;
  }

  const analysisResult = await analyzeRace({
    race: stagedRace,
    horses: stagedHorses,
    settings: settingsData,
  });

  // Ver7.7: 確定補正を表示スコアへ反映（AIエンジン非改変）
  const adjMap = new Map(
    (stagedHorses || []).map((h) => [Number(h.number), h._drawAdjustments || []])
  );
  let ranked = [...(analysisResult.horses || [])].map((h) => ({
    ...h,
    _drawAdjustments: adjMap.get(Number(h.number)) || h._drawAdjustments || [],
  }));
  ranked = applyDrawScoreAdjustments(ranked, effectiveStage);
  ranked = applyOddsMarketAdjustments(ranked, effectiveStage);
  ranked = applyWeatherTrackAdjustments(
    ranked,
    raceForEngine,
    effectiveStage
  );
  ranked = applyNewsScoreAdjustments(
    ranked,
    newsBundle?.items || []
  );
  ranked = applySocialScoreAdjustments(
    ranked,
    socialBundle?.trends || null
  );
  ranked = applyDiscussionScoreAdjustments(
    ranked,
    discussionBundle
  ).sort(
    (a, b) =>
      (b.thinking?.score || 0) - (a.thinking?.score || 0) ||
      b.indexes.total - a.indexes.total
  );

  // Ver8.3 Prediction Explainability — Discussion Evidence に基づく説明
  const raceKey = [
    params.get("date") || raceForEngine.date || "",
    params.get("venue") || raceForEngine.venue || "",
    raceForEngine.number || "",
  ].join("_");
  const blendedConfEl = document.getElementById("stage-confidence");
  const blendedConfNum = blendedConfEl?.textContent
    ? Number(String(blendedConfEl.textContent).replace("%", ""))
    : discussionBundle?.consensus?.finalConfidence ?? confHint ?? null;

  const explainBundle =
    guardSync(
      "Explain",
      () =>
        loadExplainForAi({
          discussion: discussionBundle,
          ranked,
          stage: effectiveStage,
          blendedConfidence: Number.isFinite(blendedConfNum)
            ? blendedConfNum
            : null,
          raceKey,
          hasWeather: Boolean(weatherBundle?.ok),
          hasNews: Boolean(newsBundle?.ok),
          hasSocial: Boolean(socialBundle?.ok),
          hasLearning: true,
        }),
      { ok: false, status: "error" },
      "説明生成に失敗しました。予想結果の表示は継続します。"
    ).data || { ok: false, status: "error" };

  if (explainBundle?.ok && explainBundle.aiExplain) {
    try {
      const aiInput =
        intelPacket.fusedInput?.aiInput ||
        intelPacket.aiInput ||
        null;
      if (aiInput && typeof aiInput === "object") {
        aiInput.explain = explainBundle.aiExplain;
      }
      if (raceForEngine && typeof raceForEngine === "object") {
        raceForEngine.explain = explainBundle.unified || null;
      }
    } catch {
      /* explain inject must not break analysis */
    }
  }
  bindExplainStatusUi(explainBundle);
  bindExplainDevUi(explainBundle);

  // Ver8.4 Knowledge Graph — AI推論基盤（全データ統合）
  const knowledgeBundle =
    guardSync(
      "KnowledgeGraph",
      () =>
        loadKnowledgeGraphForAi({
          race: raceForEngine,
          horses: stagedHorses,
          ranked,
          stage: effectiveStage,
          raceKey,
          entryBundle,
          drawBundle,
          oddsBundle,
          weatherBundle,
          newsBundle,
          socialBundle,
          discussionBundle,
          explainBundle,
        }),
      { ok: false, status: "error", syncSkipped: false },
      "Knowledge Graph の同期に失敗しました。他の分析結果は表示を継続します。"
    ).data || { ok: false, status: "error", syncSkipped: false };

  if (knowledgeBundle?.ok && knowledgeBundle.aiKnowledge) {
    try {
      const aiInput =
        intelPacket.fusedInput?.aiInput ||
        intelPacket.aiInput ||
        null;
      if (aiInput && typeof aiInput === "object") {
        aiInput.knowledgeGraph = knowledgeBundle.aiKnowledge;
        // Discussion / Explain / Learning / Prediction は KG 経由で関連取得
        const kgQuery = getKnowledgeQuery();
        aiInput.knowledgeQueryMeta = {
          via: "KnowledgeGraph",
          capabilities: knowledgeBundle.aiKnowledge.queryCapabilities,
        };
        if (aiInput.discussion && typeof aiInput.discussion === "object") {
          aiInput.discussion.knowledge = enrichEngineContext("Discussion", {
            horseName: ranked[0]?.horse || ranked[0]?.horseName,
          });
        }
        if (aiInput.explain && typeof aiInput.explain === "object") {
          aiInput.explain.knowledge = enrichEngineContext("Explainability", {
            horseName: ranked[0]?.horse || ranked[0]?.horseName,
          });
          // top horses contexts
          aiInput.explain.horseKnowledge = (ranked || [])
            .slice(0, 5)
            .map((h) =>
              kgQuery.horseContext(h.horse || h.horseName || "")
            )
            .filter(Boolean);
        }
        aiInput.learningKnowledge = enrichEngineContext("Learning", {});
        aiInput.predictionKnowledge = enrichEngineContext("Prediction", {
          horseName: ranked[0]?.horse || ranked[0]?.horseName,
        });
      }
      if (raceForEngine && typeof raceForEngine === "object") {
        raceForEngine.knowledgeGraph = knowledgeBundle.unified || null;
      }
    } catch {
      /* knowledge inject must not break analysis */
    }
  }
  bindKnowledgeStatusUi(knowledgeBundle);
  bindKnowledgeDevUi(knowledgeBundle);
  bindReleaseRcUi({
    analysisMs: Math.round(
      (typeof performance !== "undefined" ? performance.now() : Date.now()) -
        perfStarted
    ),
    knowledgeSkipped: Boolean(knowledgeBundle?.syncSkipped),
  });

  // Ver5.5: 予想スナップショットを Learning DB へ蓄積（ロジック書換なし）
  try {
    recordPrediction({
      race: raceForEngine,
      topNumbers: ranked.slice(0, 5).map((h) => h.number),
      rankedNumbers: ranked.slice(0, 8).map((h) => h.number),
      topPopularity: ranked[0]?.popularity ?? null,
      scores: {
        ...(engineResult.scores || {}),
        finalIqScore: marketResult.finalIq?.finalIqScore,
      },
      analyzerSnapshot: {},
    });
  } catch {
    /* learning store failure must not break analysis */
  }

  saveLastPrediction({
    race,
    prediction: {
      topNumbers: ranked.slice(0, 5).map((h) => h.number),
      indexes: Object.fromEntries(
        ranked.map((h) => [String(h.number), h.indexes.total])
      ),
    },
  });

  renderAnalysis(analysisResult, race);
  runAnalysisSequence();
  initV5Extras({ autoThink: true });
  initAiDebateMode({
    getContext: () => debateContext,
  });

  document.getElementById("back-to-detail").href =
    `race-detail.html?${detailParams.toString()}`;
  document.getElementById("go-ticket").addEventListener("click", () => {
    navigateWithFade(`ticket.html?${detailParams.toString()}`);
  });

  document.getElementById("detail-close")?.addEventListener("click", () => {
    hideDetail();
  });
}

function bindDataStatusUi(status) {
  const source = document.getElementById("data-source-label");
  const updated = document.getElementById("data-updated-label");
  if (source) source.textContent = status?.sourceLabel || "Dummy Data";
  if (updated) {
    updated.textContent =
      status?.providerId === "dummy" || status?.providerId === "mock"
        ? formatUpdateTime(new Date().toISOString())
        : status?.updatedLabel || formatUpdateTime(new Date().toISOString());
  }
}

function bindIntegrationDataUi(bundle) {
  const status = bundle?.dataStatus;
  const comp = bundle?.completeness;
  if (status) {
    setMark("ds-meeting", status.meeting);
    setMark("ds-card", status.card);
    setMark("ds-jockey", status.jockey);
    setMark("ds-weight", status.weight);
    setMark("ds-frame", status.frame);
    setMark("ds-track", status.track);
    setMark("ds-odds", status.odds);
  }
  if (comp) {
    setText("dc-race", `${comp.race}%`);
    setText("dc-horse", `${comp.horse}%`);
    setText("dc-odds", `${comp.odds}%`);
    setText("dc-market", `${comp.market}%`);
    setText("dc-overall", `${comp.overall}%`);
    setText("dc-note", comp.note || "");
  }
  setText("dev-map-status", bundle?.mapping?.status || "—");
  setText("dev-map-provider", bundle?.providerId || "—");
  setText(
    "dev-validation-v73",
    bundle?.validation?.ok
      ? `OK (warn ${bundle.validation.warnings?.length || 0})`
      : `NG ${bundle?.validation?.errors?.length || 0}`
  );
  setText(
    "dev-completeness",
    comp ? `Overall ${comp.overall}%` : "—"
  );
  setText(
    "dev-count-v73",
    `races ${bundle?.count?.races || 0} / horses ${bundle?.count?.horses || 0}`
  );

  bindProviderFrameworkUi(bundle);

  // Confidence 表示へ Completeness を反映（評価ロジック非改変）
  if (comp?.overall != null) {
    const blended = confidenceFromCompleteness(
      bundle?.confidenceHint ?? 72,
      comp
    );
    const confEl = document.getElementById("stage-confidence");
    if (confEl && blended != null) {
      confEl.textContent = `${blended}%`;
    }
  }
}

function setMark(id, cell) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = cell?.mark || "—";
  el.title = cell?.label || "";
  el.classList.toggle("is-ok", cell?.mark === "〇");
  el.classList.toggle("is-partial", cell?.mark === "△");
  el.classList.toggle("is-ng", cell?.mark === "×");
}

function bindProviderFrameworkUi(bundle) {
  const fw = bundle?.framework || getFrameworkDashboard()?.last || null;
  const failover = bundle?.failover || fw?.failover || {};
  const merge = bundle?.merge || fw?.merge || {};
  const provenance = bundle?.provenance || null;

  setText(
    "dev-failover-v74",
    failover.active
      ? `ON ${failover.failoverFrom || "?"} → ${failover.finalProviderId || "?"}`
      : failover.path?.length
        ? `path: ${failover.path.join(" → ")}`
        : "—"
  );
  setText(
    "dev-merge-v74",
    merge.strategy
      ? `${merge.strategy}${merge.note ? ` (${merge.note})` : ""}`
      : "—"
  );
  setText(
    "dev-provenance-v74",
    provenance
      ? `${provenance.providerId} @ ${formatUpdateTime(provenance.fetchedAt)} v${
          provenance.providerVersion || "—"
        }`
      : "—"
  );
  setText(
    "dev-count-v74",
    `races ${bundle?.count?.races || fw?.count?.races || 0} / horses ${
      bundle?.count?.horses || fw?.count?.horses || 0
    }`
  );

  renderProviderFrameworkTable(bundle).catch(() => {});
}

function bindRaceConnectStatusUi(raceConnect) {
  const ok = Boolean(raceConnect?.ok);
  setText("rc-status", ok ? "〇 取得済" : raceConnect?.blocked ? "× 未接続" : "× 失敗");
  setText(
    "rc-count",
    `meetings ${raceConnect?.count?.meetings || 0} / races ${
      raceConnect?.count?.races || 0
    }`
  );
  setText(
    "rc-updated",
    raceConnect?.fetchedAt ? formatUpdateTime(raceConnect.fetchedAt) : "—"
  );
  setText("rc-provider", raceConnect?.providerId || "—");
  setText(
    "rc-validation",
    raceConnect?.validation?.ok
      ? `OK (warn ${raceConnect.validation.warnings?.length || 0})`
      : `NG ${raceConnect?.validation?.errors?.length || 0}`
  );
}

function bindRealRaceCalendarUi(cal) {
  const mode = cal?.mode || getCalendarMode();
  const kind = cal?.providerKind || (mode === "real" ? "Real" : "Mock");
  const venues = (cal?.meetings || [])
    .flatMap((m) => (m.venues || []).map((v) => v.label || v.venueId))
    .filter(Boolean);
  const uniqueVenues = [...new Set(venues)];

  setText(
    "real-meeting-active",
    cal?.ok
      ? `${cal.meetings?.length || 0} 日`
      : mode === "real"
        ? "取得不可"
        : "Mock"
  );
  setText(
    "real-venues",
    uniqueVenues.length ? uniqueVenues.slice(0, 6).join(" / ") : "—"
  );
  setText("real-race-count", String(cal?.races?.length || 0));
  setText(
    "real-updated",
    cal?.updatedAt ? formatUpdateTime(cal.updatedAt) : "—"
  );
  setText(
    "real-provider-kind",
    kind === "real" || kind === "Real" ? "Real" : "Mock"
  );
  setText(
    "real-race-note",
    !cal?.ok && mode === "real"
      ? cal?.userMessage || "現在実データを取得できません"
      : cal?.skipped
        ? "開催情報に変更なし（再取得スキップ）"
        : ""
  );

  setText(
    "dev-real-status",
    !cal?.ok && mode === "real"
      ? "ERROR"
      : cal?.ok
        ? "ONLINE"
        : mode === "real"
          ? "OFFLINE"
          : "MOCK"
  );
  setText("dev-real-provider", cal?.providerId || (mode === "real" ? "real-race" : "mock"));
  setText(
    "dev-real-count",
    `meetings ${cal?.meetings?.length || 0} / races ${cal?.races?.length || 0}`
  );
  setText(
    "dev-real-sync",
    cal?.skipped ? "skipped(unchanged)" : cal?.ok ? "synced" : "—"
  );
  setText(
    "dev-real-validation",
    cal?.validation?.ok
      ? `OK (warn ${cal.validation.warnings?.length || 0})`
      : `NG ${cal?.validation?.errors?.length || 0}`
  );
  setText(
    "dev-real-updated",
    cal?.updatedAt ? formatUpdateTime(cal.updatedAt) : "—"
  );
}

function bindRaceConnectDevUi(raceConnect) {
  const mon = raceConnect?.monitor || getRaceConnectStatus();
  setText("dev-rc-status", mon.status || raceConnect?.message || "—");
  setText("dev-rc-success", String(mon.successCount ?? 0));
  setText("dev-rc-fail", String(mon.failCount ?? 0));
  setText(
    "dev-rc-sync",
    raceConnect?.sync?.status || mon.syncStatus || "—"
  );
  setText(
    "dev-rc-updated",
    mon.lastUpdatedAt ? formatUpdateTime(mon.lastUpdatedAt) : "—"
  );
  setText(
    "dev-rc-validation",
    raceConnect?.validation?.ok
      ? `OK / races ${raceConnect.count?.races || 0}`
      : `NG ${raceConnect?.validation?.errors?.length || 0}`
  );
}

function mergeHorsesWithEntries(horses = [], entries = []) {
  const map = new Map((entries || []).map((e) => [Number(e.number), e]));
  return (horses || []).map((h) => {
    const e = map.get(Number(h.number));
    if (!e) return h;
    return {
      ...h,
      entryStatus: e.entryStatus,
      entryStatusLabel: e.entryStatusLabel,
      affiliation: e.affiliation || h.affiliation,
      careerRecord: e.careerRecord,
      distanceRecord: e.distanceRecord,
      courseRecord: e.courseRecord,
      trackRecord: e.trackRecord,
      stakesRecord: e.stakesRecord,
      earnings: e.earnings,
      age: h.age ?? e.age,
      sex: h.sex || e.sex,
    };
  });
}

function bindEntryStatusUi(entryBundle) {
  const stats = entryBundle?.stats || {};
  const ec = entryBundle?.entryCompleteness || {};
  const active =
    (stats.entryExpected ?? 0) +
    (stats.confirmed ?? 0) +
    (stats.registered ?? 0);
  setText("entry-registered", String(stats.registered ?? "—"));
  setText(
    "entry-planned",
    String(stats.entryExpected ?? stats.planned ?? "—")
  );
  setText("entry-scratched", String(stats.scratched ?? "—"));
  setText("entry-excluded", String(stats.excluded ?? "—"));
  setText(
    "entry-field-size",
    String(stats.active ?? active ?? entryBundle?.count ?? "—")
  );
  setText(
    "entry-completeness",
    ec.overall != null
      ? `${ec.overall}%`
      : stats.completeness != null
        ? `${stats.completeness}%`
        : "—"
  );
  setText(
    "entry-updated",
    entryBundle?.fetchedAt ? formatUpdateTime(entryBundle.fetchedAt) : "—"
  );
  setText(
    "entry-provider-kind",
    entryBundle?.providerKind ||
      (entryBundle?.mode === "real" ? "Real" : "Mock")
  );
  setText(
    "entry-stage-note",
    entryBundle?.ok === false
      ? entryBundle?.userMessage || "出馬表を取得できませんでした"
      : entryBundle?.stageNote || ""
  );

  setText(
    "ec-registered",
    ec.registered != null ? `${ec.registered}%` : "—"
  );
  setText("ec-career", ec.career != null ? `${ec.career}%` : "—");
  setText("ec-trainer", ec.trainer != null ? `${ec.trainer}%` : "—");
  setText("ec-distance", ec.distance != null ? `${ec.distance}%` : "—");
  setText("ec-frame", `${ec.frame ?? 0}%`);
  setText("ec-jockey", `${ec.jockey ?? 0}%`);
  setText("ec-weight", `${ec.weight ?? 0}%`);
  setText("ec-overall", ec.overall != null ? `${ec.overall}%` : "—");
  setText("ec-note", ec.note || "");
}

function bindEntryAiPanel(entryBundle) {
  const panel = entryBundle?.stagePanel;
  if (!panel) return;
  setText("entry-ai-title", panel.title || "現在分析段階");
  setText("entry-ai-stage", panel.stageLabel || `Stage${panel.stage || 0}`);
  setText("entry-ai-mode", panel.mode || "—");
  setText(
    "entry-ai-provisional",
    panel.provisionalText || "現在は暫定分析です。"
  );
  if ((panel.stage || 0) < 3) {
    setText("entry-ai-using-label", "利用中データ");
    setText("entry-ai-pending-label", "未確定情報");
  }

  const fillList = (id, items) => {
    const el = document.getElementById(id);
    if (!el) return;
    clearElement(el);
    const list = items || [];
    if (!list.length) {
      const li = document.createElement("li");
      li.textContent = "—";
      el.appendChild(li);
      return;
    }
    list.forEach((label) => {
      const li = document.createElement("li");
      li.textContent = label;
      el.appendChild(li);
    });
  };
  fillList("entry-ai-using", panel.using);
  fillList("entry-ai-pending", panel.pending);
}

function bindEntryDevUi(entryBundle) {
  const dash = getEntryDashboard();
  const stats = entryBundle?.stats || dash.stats || {};
  const mode = getEntryMode();
  setText(
    "dev-entry-count",
    String(entryBundle?.count ?? stats.total ?? 0)
  );
  setText(
    "dev-entry-by-status",
    [
      `登${stats.registered ?? 0}`,
      `予${stats.entryExpected ?? stats.planned ?? 0}`,
      `確${stats.confirmed ?? 0}`,
      `取${stats.scratched ?? 0}`,
      `除${stats.excluded ?? 0}`,
      `回${stats.withdrawn ?? 0}`,
    ].join(" / ")
  );
  setText(
    "dev-entry-validation",
    entryBundle?.validation?.ok
      ? `OK (warn ${entryBundle.validation.warnings?.length || 0})`
      : `NG ${entryBundle?.validation?.errors?.length || 0}`
  );
  setText("dev-entry-sync", entryBundle?.sync?.status || dash.syncStatus || "—");
  setText(
    "dev-entry-updated",
    entryBundle?.fetchedAt
      ? formatUpdateTime(entryBundle.fetchedAt)
      : dash.updatedAt
        ? formatUpdateTime(dash.updatedAt)
        : "—"
  );
  setText(
    "dev-horse-status",
    entryBundle?.ok === false
      ? "ERROR"
      : entryBundle?.mode === "real"
        ? "ONLINE"
        : "MOCK"
  );
  setText(
    "dev-horse-provider",
    entryBundle?.providerId || (mode === "real" ? "real-horse" : "mock")
  );
  setText(
    "dev-horse-count",
    String(entryBundle?.count ?? stats.total ?? 0)
  );
  setText(
    "dev-horse-validation",
    entryBundle?.validation?.ok
      ? `OK (warn ${entryBundle.validation.warnings?.length || 0})`
      : `NG ${entryBundle?.validation?.errors?.length || 0}`
  );
  setText(
    "dev-horse-sync",
    entryBundle?.sync?.status || dash.syncStatus || "—"
  );
  setText(
    "dev-horse-updated",
    entryBundle?.fetchedAt
      ? formatUpdateTime(entryBundle.fetchedAt)
      : "—"
  );

  bindEntryModeControls();
}

function bindEntryModeControls() {
  const mode = getEntryMode();
  const note = document.getElementById("entry-mode-note");
  if (note) {
    note.textContent =
      mode === "real"
        ? "Real Horse Entry（失敗時は Mock へ自動切替しません）"
        : "Mock Horse Entry を使用中";
  }
  document.querySelectorAll("[data-entry-mode]").forEach((btn) => {
    btn.classList.toggle(
      "is-active",
      btn.getAttribute("data-entry-mode") === mode
    );
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      setEntryMode(btn.getAttribute("data-entry-mode"));
      location.reload();
    });
  });
}

function bindDrawStatusUi(drawBundle) {
  const dc = drawBundle?.drawCompleteness || {};
  const stats = drawBundle?.stats || {};
  setText("dc-draw-frame", dc.frame != null ? `${dc.frame}%` : "—");
  setText("dc-draw-jockey", dc.jockey != null ? `${dc.jockey}%` : "—");
  setText("dc-draw-weight", dc.weight != null ? `${dc.weight}%` : "—");
  setText(
    "dc-draw-scratch",
    dc.scratchInfo != null ? `${dc.scratchInfo}%` : "—"
  );
  setText("dc-draw-odds", `${dc.odds ?? 0}%`);
  setText("dc-draw-news", `${dc.news ?? 0}%`);
  setText(
    "dc-draw-overall",
    dc.overall != null ? `${dc.overall}%` : "—"
  );
  setText("dc-draw-note", dc.note || "");
  setText("draw-active", String(stats.active ?? "—"));
  setText("draw-scratched", String(stats.scratched ?? "—"));
  setText("draw-excluded", String(stats.excluded ?? "—"));
  setText(
    "draw-updated",
    drawBundle?.fetchedAt ? formatUpdateTime(drawBundle.fetchedAt) : "—"
  );
  setText("draw-stage-note", drawBundle?.stageNote || "");

  // Entry Completeness の枠/騎手/斤量を Draw 実績で更新
  if (dc.frame != null) setText("ec-frame", `${dc.frame}%`);
  if (dc.jockey != null) setText("ec-jockey", `${dc.jockey}%`);
  if (dc.weight != null) setText("ec-weight", `${dc.weight}%`);
}

function bindDrawAiPanel(drawBundle, stage) {
  const panel = drawBundle?.stagePanel;
  if (!panel) return;
  const s = Number(stage ?? panel.stage) || 0;
  if (s < 3 || s >= 6) return; // Stage6+ は Odds パネル優先

  setText("entry-ai-title", panel.title || "現在分析段階");
  setText("entry-ai-stage", panel.stageLabel || `Stage${s}`);
  setText("entry-ai-mode", panel.mode || "—");
  setText("entry-ai-using-label", "取得済み情報");
  setText("entry-ai-pending-label", "未取得情報");

  const pending = [...(panel.pending || [])];
  const ensurePending = (label) => {
    if (!pending.includes(label)) pending.push(label);
  };
  if ((drawBundle?.drawCompleteness?.odds ?? 0) === 0) {
    ensurePending("最新オッズ");
  }
  if (s >= 5 && (drawBundle?.drawCompleteness?.odds ?? 0) === 0) {
    ensurePending("当日馬場");
    ensurePending("最終天候");
    ensurePending("直前情報");
  }

  const provisional =
    s >= 3 && (drawBundle?.drawCompleteness?.odds ?? 0) === 0
      ? "現在は確定情報を反映した分析です。"
      : panel.provisionalText || "現在は確定情報を反映した分析です。";
  setText("entry-ai-provisional", provisional);

  const fillList = (id, items) => {
    const el = document.getElementById(id);
    if (!el) return;
    clearElement(el);
    const list = [...new Set(items || [])];
    if (!list.length) {
      const li = document.createElement("li");
      li.textContent = "—";
      el.appendChild(li);
      return;
    }
    list.forEach((label) => {
      const li = document.createElement("li");
      li.textContent = label;
      el.appendChild(li);
    });
  };
  fillList("entry-ai-using", panel.acquired);
  fillList("entry-ai-pending", pending);

  setText("stage-mode", panel.mode || "—");
  setText("stage-provisional", provisional);
  setText(
    "stage-note",
    `取得済み: ${(panel.acquired || []).join("・") || "—"}`
  );
  const pendingEl = document.getElementById("stage-pending");
  if (pendingEl) {
    clearElement(pendingEl);
    [...new Set(pending)].forEach((label) => {
      const li = document.createElement("li");
      li.textContent = label;
      pendingEl.appendChild(li);
    });
  }
}

function bindDrawDevUi(drawBundle) {
  const dash = getDrawDashboard();
  const stats = drawBundle?.stats || dash.stats || {};
  const js = drawBundle?.jockeyStatus || dash.jockeyStatus || {};
  const ws = drawBundle?.weightStatus || dash.weightStatus || {};
  setText(
    "dev-draw-status",
    drawBundle?.ok
      ? `枠${stats.frameRate ?? 0}% / 騎${stats.jockeyRate ?? 0}% / 斤${stats.weightRate ?? 0}%`
      : "—"
  );
  setText(
    "dev-jockey-status",
    `確${js.confirmed ?? 0}/${js.total ?? 0} 替${js.riderChanged ?? 0}`
  );
  setText(
    "dev-weight-status",
    `確${ws.confirmed ?? 0}/${ws.total ?? 0} 変${ws.changed ?? 0}`
  );
  setText(
    "dev-draw-validation",
    drawBundle?.validation?.ok
      ? `OK (warn ${drawBundle.validation.warnings?.length || 0})`
      : `NG ${drawBundle?.validation?.errors?.length || 0}`
  );
  setText("dev-draw-sync", drawBundle?.sync?.status || dash.syncStatus || "—");
  const hist = drawBundle?.history || dash.history || [];
  setText(
    "dev-draw-history",
    hist.length
      ? hist
          .slice(0, 3)
          .map((h) => h.type)
          .join(", ")
      : "—"
  );
  setText(
    "dev-draw-updated",
    drawBundle?.fetchedAt
      ? formatUpdateTime(drawBundle.fetchedAt)
      : dash.updatedAt
        ? formatUpdateTime(dash.updatedAt)
        : "—"
  );
}

function bindOddsStatusUi(oddsBundle) {
  const oc = oddsBundle?.oddsCompleteness || {};
  const stats = oddsBundle?.stats || {};
  const ms = oddsBundle?.marketStatus || {};
  const sample = (oddsBundle?.odds || [])
    .slice()
    .sort((a, b) => (a.popularity || 99) - (b.popularity || 99))[0];

  setText("oc-odds", oc.odds != null ? `${oc.odds}%` : "—");
  setText("oc-popularity", oc.popularity != null ? `${oc.popularity}%` : "—");
  setText("oc-market", oc.market != null ? `${oc.market}%` : "—");
  setText("oc-news", `${oc.news ?? 0}%`);
  setText("oc-sns", `${oc.sns ?? 0}%`);
  setText("oc-overall", oc.overall != null ? `${oc.overall}%` : "—");
  setText("oc-note", oc.note || "");
  setText("odds-count", String(stats.total ?? oddsBundle?.count ?? "—"));
  setText(
    "odds-fetch-rate",
    oc.overall != null ? `${oc.overall}%` : "—"
  );
  setText(
    "odds-win-sample",
    sample?.winOdds != null ? String(sample.winOdds) : "—"
  );
  setText(
    "odds-place-sample",
    sample?.placeOdds != null ? String(sample.placeOdds) : "—"
  );
  setText(
    "odds-pop-sample",
    sample?.popularity != null ? `${sample.popularity}人気` : "—"
  );
  setText(
    "odds-market-score",
    ms.avgMarketScore != null ? String(ms.avgMarketScore) : "—"
  );
  setText(
    "odds-provider-kind",
    oddsBundle?.providerKind ||
      (oddsBundle?.mode === "real" ? "Real" : "Mock")
  );
  setText(
    "odds-updated",
    oddsBundle?.fetchedAt ? formatUpdateTime(oddsBundle.fetchedAt) : "—"
  );
  setText(
    "odds-stage-note",
    oddsBundle?.ok === false
      ? oddsBundle?.userMessage || "オッズ情報を取得できませんでした"
      : oddsBundle?.stageNote || ""
  );

  if (oc.odds != null) setText("dc-draw-odds", `${oc.odds}%`);
}

function bindOddsAiPanel(oddsBundle, stage) {
  const panel = oddsBundle?.stagePanel;
  if (!panel || !oddsBundle?.ok) return;
  const s = Number(stage ?? panel.stage) || 0;
  if (s < 6) return;

  setText("entry-ai-title", panel.title || "現在分析段階");
  setText("entry-ai-stage", panel.stageLabel || `Stage${s}`);
  setText("entry-ai-mode", panel.mode || "—");
  setText("entry-ai-using-label", "取得済み");
  setText("entry-ai-pending-label", "未取得");
  setText(
    "entry-ai-provisional",
    panel.provisionalText || "最新オッズを反映した分析です。"
  );

  const fillList = (id, items) => {
    const el = document.getElementById(id);
    if (!el) return;
    clearElement(el);
    const list = items || [];
    if (!list.length) {
      const li = document.createElement("li");
      li.textContent = "—";
      el.appendChild(li);
      return;
    }
    list.forEach((label) => {
      const li = document.createElement("li");
      li.textContent = label;
      el.appendChild(li);
    });
  };
  fillList("entry-ai-using", panel.acquired);
  fillList("entry-ai-pending", panel.pending);

  setText("stage-mode", panel.mode || "—");
  setText("stage-provisional", panel.provisionalText || "");
  setText(
    "stage-note",
    `取得済み: ${(panel.acquired || []).join("・") || "—"}`
  );
  const pendingEl = document.getElementById("stage-pending");
  if (pendingEl) {
    clearElement(pendingEl);
    (panel.pending || []).forEach((label) => {
      const li = document.createElement("li");
      li.textContent = label;
      pendingEl.appendChild(li);
    });
  }
}

function bindOddsDevUi(oddsBundle) {
  const dash = getOddsDashboard();
  const stats = oddsBundle?.stats || dash.stats || {};
  const ms = oddsBundle?.marketStatus || {};
  const mode = getOddsMode();
  setText(
    "dev-odds-status",
    oddsBundle?.ok === false
      ? "ERROR"
      : oddsBundle?.ok
        ? `${stats.total ?? 0}頭 / ${oddsBundle.phase || dash.phase || "—"}`
        : "—"
  );
  setText(
    "dev-market-status",
    `M${ms.avgMarketScore ?? 0} S${ms.avgSupportScore ?? 0} V${ms.avgValueScore ?? 0}`
  );
  setText("dev-odds-count", String(oddsBundle?.count ?? stats.total ?? 0));
  setText(
    "dev-odds-validation",
    oddsBundle?.validation?.ok
      ? `OK (warn ${oddsBundle.validation.warnings?.length || 0})`
      : `NG ${oddsBundle?.validation?.errors?.length || 0}`
  );
  setText("dev-odds-sync", oddsBundle?.sync?.status || dash.syncStatus || "—");
  const hist = oddsBundle?.history || dash.history || [];
  setText(
    "dev-odds-history",
    hist.length
      ? hist
          .slice(0, 3)
          .map((h) => h.type)
          .join(", ")
      : "—"
  );
  setText(
    "dev-odds-updated",
    oddsBundle?.fetchedAt
      ? formatUpdateTime(oddsBundle.fetchedAt)
      : dash.updatedAt
        ? formatUpdateTime(dash.updatedAt)
        : "—"
  );
  setText(
    "dev-real-odds-status",
    oddsBundle?.ok === false
      ? "ERROR"
      : oddsBundle?.mode === "real"
        ? "ONLINE"
        : "MOCK"
  );
  setText(
    "dev-real-odds-provider",
    oddsBundle?.providerId || (mode === "real" ? "real-odds" : "mock")
  );
  setText(
    "dev-real-odds-count",
    String(oddsBundle?.count ?? stats.total ?? 0)
  );
  setText(
    "dev-real-odds-updates",
    String(oddsBundle?.updateCount ?? hist.length ?? 0)
  );
  setText(
    "dev-real-odds-validation",
    oddsBundle?.validation?.ok
      ? `OK (warn ${oddsBundle.validation.warnings?.length || 0})`
      : `NG ${oddsBundle?.validation?.errors?.length || 0}`
  );
  setText(
    "dev-real-odds-sync",
    oddsBundle?.sync?.status || dash.syncStatus || "—"
  );
  setText(
    "dev-real-odds-updated",
    oddsBundle?.fetchedAt
      ? formatUpdateTime(oddsBundle.fetchedAt)
      : "—"
  );

  bindOddsModeControls();
}

function bindOddsModeControls() {
  const mode = getOddsMode();
  const note = document.getElementById("odds-mode-note");
  if (note) {
    note.textContent =
      mode === "real"
        ? "Real Odds（失敗時は Mock へ自動切替しません）"
        : "Mock Odds を使用中";
  }
  document.querySelectorAll("[data-odds-mode]").forEach((btn) => {
    btn.classList.toggle(
      "is-active",
      btn.getAttribute("data-odds-mode") === mode
    );
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      setOddsMode(btn.getAttribute("data-odds-mode"));
      location.reload();
    });
  });
}

function bindWeatherStatusUi(weatherBundle) {
  const wc = weatherBundle?.weatherCompleteness || {};
  const w = weatherBundle?.weather || {};
  setText("wc-weather", wc.weather != null ? `${wc.weather}%` : "—");
  setText("wc-track", wc.track != null ? `${wc.track}%` : "—");
  setText("wc-wind", wc.wind != null ? `${wc.wind}%` : "—");
  setText("wc-moisture", wc.moisture != null ? `${wc.moisture}%` : "—");
  setText("wc-news", `${wc.news ?? 0}%`);
  setText("wc-sns", `${wc.sns ?? 0}%`);
  setText("wc-overall", wc.overall != null ? `${wc.overall}%` : "—");
  setText("wc-note", wc.note || "");
  setText("weather-label", w.weather || "—");
  setText("weather-track", w.trackCondition || "—");
  setText(
    "weather-wind",
    w.windSpeed != null
      ? `${w.windSpeed}m/s ${w.windDirection || ""}`.trim()
      : "—"
  );
  setText(
    "weather-updated",
    weatherBundle?.fetchedAt
      ? formatUpdateTime(weatherBundle.fetchedAt)
      : "—"
  );
  setText("weather-stage-note", weatherBundle?.stageNote || "");
}

function bindWeatherAiPanel(weatherBundle, stage) {
  const panel = weatherBundle?.stagePanel;
  if (!panel || !weatherBundle?.ok) return;
  const s = Number(stage ?? panel.stage) || 0;
  if (s < 6) return;

  setText("entry-ai-title", panel.title || "現在分析段階");
  setText("entry-ai-stage", panel.stageLabel || `Stage${s}`);
  setText("entry-ai-mode", panel.mode || "—");
  setText("entry-ai-using-label", "取得済み");
  setText("entry-ai-pending-label", "未取得");
  setText(
    "entry-ai-provisional",
    panel.provisionalText || "当日最新の天候・馬場を反映した分析です。"
  );

  const fillList = (id, items) => {
    const el = document.getElementById(id);
    if (!el) return;
    clearElement(el);
    const list = items || [];
    if (!list.length) {
      const li = document.createElement("li");
      li.textContent = "—";
      el.appendChild(li);
      return;
    }
    list.forEach((label) => {
      const li = document.createElement("li");
      li.textContent = label;
      el.appendChild(li);
    });
  };
  fillList("entry-ai-using", panel.acquired);
  fillList("entry-ai-pending", panel.pending);

  setText("stage-mode", panel.mode || "—");
  setText("stage-provisional", panel.provisionalText || "");
  setText(
    "stage-note",
    `取得済み: ${(panel.acquired || []).join("・") || "—"}`
  );
  const pendingEl = document.getElementById("stage-pending");
  if (pendingEl) {
    clearElement(pendingEl);
    (panel.pending || []).forEach((label) => {
      const li = document.createElement("li");
      li.textContent = label;
      pendingEl.appendChild(li);
    });
  }
}

function bindWeatherDevUi(weatherBundle) {
  const dash = getWeatherDashboard();
  const w = weatherBundle?.weather || dash.weather || {};
  const intel = weatherBundle?.trackIntel || dash.trackIntel || {};
  setText(
    "dev-weather-status",
    weatherBundle?.ok
      ? `${w.weather || "—"} / ${w.temperature ?? "—"}℃ / ${weatherBundle.phase || "—"}`
      : "—"
  );
  setText(
    "dev-track-status",
    weatherBundle?.ok
      ? `${w.trackCondition || "—"} T${intel.trackScore ?? "—"} W${intel.weatherScore ?? "—"} S${intel.surfaceScore ?? "—"}`
      : "—"
  );
  setText(
    "dev-weather-validation",
    weatherBundle?.validation?.ok
      ? `OK (warn ${weatherBundle.validation.warnings?.length || 0})`
      : `NG ${weatherBundle?.validation?.errors?.length || 0}`
  );
  setText(
    "dev-weather-sync",
    weatherBundle?.sync?.status || dash.syncStatus || "—"
  );
  const hist = weatherBundle?.history || dash.history || [];
  setText(
    "dev-weather-history",
    hist.length
      ? hist
          .slice(0, 3)
          .map((h) => h.type)
          .join(", ")
      : "—"
  );
  setText(
    "dev-weather-updated",
    weatherBundle?.fetchedAt
      ? formatUpdateTime(weatherBundle.fetchedAt)
      : dash.updatedAt
        ? formatUpdateTime(dash.updatedAt)
        : "—"
  );
}

function bindNewsStatusUi(newsBundle) {
  const stats = newsBundle?.stats || {};
  const reflect = newsBundle?.aiReflect || {};
  setText("news-count", String(stats.total ?? newsBundle?.count ?? "—"));
  setText("news-important", String(stats.important ?? "—"));
  setText(
    "news-updated",
    newsBundle?.fetchedAt ? formatUpdateTime(newsBundle.fetchedAt) : "—"
  );
  setText(
    "news-ai-reflect",
    reflect.label || (newsBundle?.ok ? "構造化データ反映中" : "—")
  );
  setText("news-stage-note", newsBundle?.stageNote || "");
  // タイトル一覧のみ（本文なし）
  const listEl = document.getElementById("news-meta-list");
  if (listEl) {
    clearElement(listEl);
    const items = (newsBundle?.items || []).slice(0, 6);
    if (!items.length) {
      const li = document.createElement("li");
      li.textContent = "—";
      listEl.appendChild(li);
    } else {
      items.forEach((n) => {
        const li = document.createElement("li");
        li.textContent = `[${n.categoryLabel || n.category}] ${n.title}`;
        listEl.appendChild(li);
      });
    }
  }
}

function bindNewsDevUi(newsBundle) {
  const dash = getNewsDashboard();
  const stats = newsBundle?.stats || dash.stats || {};
  const by = stats.byCategory || {};
  setText(
    "dev-news-status",
    newsBundle?.ok
      ? `${stats.total ?? 0}件 / 重要${stats.important ?? 0}`
      : "—"
  );
  setText("dev-news-count", String(newsBundle?.count ?? stats.total ?? 0));
  setText(
    "dev-news-categories",
    [
      `出${by.entry ?? 0}`,
      `調${by.training ?? 0}`,
      `コ${by.comment ?? 0}`,
      `取${by.scratch ?? 0}`,
      `騎${by.jockey ?? 0}`,
      `馬${by.track ?? 0}`,
      `開${by.meeting ?? 0}`,
      `他${by.other ?? 0}`,
    ].join(" / ")
  );
  setText(
    "dev-news-validation",
    newsBundle?.validation?.ok
      ? `OK (warn ${newsBundle.validation.warnings?.length || 0})`
      : `NG ${newsBundle?.validation?.errors?.length || 0}`
  );
  setText("dev-news-sync", newsBundle?.sync?.status || dash.syncStatus || "—");
  setText(
    "dev-news-updated",
    newsBundle?.fetchedAt
      ? formatUpdateTime(newsBundle.fetchedAt)
      : dash.updatedAt
        ? formatUpdateTime(dash.updatedAt)
        : "—"
  );
}

function bindSocialStatusUi(socialBundle) {
  const stats = socialBundle?.stats || {};
  const reflect = socialBundle?.aiReflect || {};
  const scores = socialBundle?.trends?.scores || {};
  setText("social-count", String(stats.total ?? socialBundle?.count ?? "—"));
  setText(
    "social-trend",
    scores.trend != null
      ? `T${scores.trend} / A${scores.attention ?? "—"} / M${scores.momentum ?? "—"} / C${scores.confidence ?? "—"}`
      : "—"
  );
  setText(
    "social-top-categories",
    (stats.topCategories || []).length
      ? (stats.topCategories || []).join(" / ")
      : "—"
  );
  setText(
    "social-ai-reflect",
    reflect.label || (socialBundle?.ok ? "構造化データ反映中" : "—")
  );
  setText("social-stage-note", socialBundle?.stageNote || "");

  const listEl = document.getElementById("social-meta-list");
  if (listEl) {
    clearElement(listEl);
    const cats = (socialBundle?.trends?.categories || []).slice(0, 6);
    if (!cats.length) {
      const li = document.createElement("li");
      li.textContent = "—";
      listEl.appendChild(li);
    } else {
      cats.forEach((c) => {
        const li = document.createElement("li");
        const ch =
          c.trendChange != null
            ? ` (${c.trendChange >= 0 ? "+" : ""}${c.trendChange}%)`
            : "";
        li.textContent = `${c.label}: ${c.count}話題 / ${c.postCount}投稿${ch}`;
        listEl.appendChild(li);
      });
    }
  }
}

function bindSocialDevUi(socialBundle) {
  const dash = getSocialDashboard();
  const stats = socialBundle?.stats || dash.stats || {};
  const by = stats.byCategory || {};
  const scores = socialBundle?.trends?.scores || dash.trends?.scores || {};
  setText(
    "dev-social-status",
    socialBundle?.ok
      ? `${stats.total ?? 0}話題 / Trend ${scores.trend ?? "—"}`
      : "—"
  );
  setText(
    "dev-trend-status",
    scores.trend != null
      ? `Trend ${scores.trend} / Att ${scores.attention} / Mom ${scores.momentum} / Conf ${scores.confidence}`
      : "—"
  );
  setText(
    "dev-social-categories",
    [
      `調${by.training ?? 0}`,
      `体${by.body ?? 0}`,
      `騎${by.jockey ?? 0}`,
      `パ${by.paddock ?? 0}`,
      `取${by.scratch ?? 0}`,
      `人${by.popularity ?? 0}`,
      `開${by.meeting ?? 0}`,
      `他${by.other ?? 0}`,
    ].join(" / ")
  );
  setText(
    "dev-social-validation",
    socialBundle?.validation?.ok
      ? `OK (warn ${socialBundle.validation.warnings?.length || 0})`
      : `NG ${socialBundle?.validation?.errors?.length || 0}`
  );
  setText(
    "dev-social-sync",
    socialBundle?.sync?.status || dash.syncStatus || "—"
  );
  setText(
    "dev-social-updated",
    socialBundle?.fetchedAt
      ? formatUpdateTime(socialBundle.fetchedAt)
      : dash.updatedAt
        ? formatUpdateTime(dash.updatedAt)
        : "—"
  );
}

function bindDiscussionStatusUi(discussionBundle) {
  const status = discussionBundle?.status || {};
  const consensus = discussionBundle?.consensus || {};
  setText(
    "discussion-status",
    status.label || (discussionBundle?.ok ? "合意形成済" : "—")
  );
  setText(
    "discussion-evidence-count",
    String(status.evidenceCount ?? discussionBundle?.count ?? "—")
  );
  setText(
    "discussion-consensus",
    consensus.consensusScore != null ? String(consensus.consensusScore) : "—"
  );
  setText(
    "discussion-conflict",
    consensus.conflictScore != null ? String(consensus.conflictScore) : "—"
  );
  setText(
    "discussion-final-confidence",
    consensus.finalConfidence != null
      ? `${consensus.finalConfidence}%`
      : "—"
  );
  setText("discussion-stage-note", discussionBundle?.stageNote || "");
}

function bindDiscussionDevUi(discussionBundle) {
  const dash = getDiscussionDashboard();
  const consensus =
    discussionBundle?.consensus || dash.consensus || {};
  setText(
    "dev-discussion-status",
    discussionBundle?.status?.label ||
      (discussionBundle?.ok ? "OK" : "—")
  );

  const listEl = document.getElementById("dev-discussion-evidence");
  if (listEl) {
    clearElement(listEl);
    const items = (discussionBundle?.evidence || []).slice(0, 12);
    if (!items.length) {
      const li = document.createElement("li");
      li.textContent = "—";
      listEl.appendChild(li);
    } else {
      items.forEach((e) => {
        const li = document.createElement("li");
        li.textContent = `[${e.sourceLabel || e.source}] ${e.claim} (C${e.scores?.confidence ?? "—"})`;
        listEl.appendChild(li);
      });
    }
  }

  const conflictEl = document.getElementById("dev-discussion-conflicts");
  if (conflictEl) {
    clearElement(conflictEl);
    const items = discussionBundle?.conflicts || [];
    if (!items.length) {
      const li = document.createElement("li");
      li.textContent = "矛盾なし";
      conflictEl.appendChild(li);
    } else {
      items.forEach((c) => {
        const li = document.createElement("li");
        li.textContent = `${c.claimType} [${c.severity}] → 採用 ${c.adoptedId}`;
        conflictEl.appendChild(li);
      });
    }
  }

  setText(
    "dev-discussion-consensus",
    consensus.consensusScore != null
      ? `Consensus ${consensus.consensusScore} / Agree ${consensus.agreementScore ?? "—"} / Conflict ${consensus.conflictScore ?? "—"} / Final ${consensus.finalConfidence ?? "—"}`
      : "—"
  );
  setText(
    "dev-discussion-validation",
    discussionBundle?.validation?.ok
      ? `OK (warn ${discussionBundle.validation.warnings?.length || 0})`
      : `NG ${discussionBundle?.validation?.errors?.length || 0}`
  );
  setText(
    "dev-discussion-updated",
    discussionBundle?.fetchedAt
      ? formatUpdateTime(discussionBundle.fetchedAt)
      : dash.updatedAt
        ? formatUpdateTime(dash.updatedAt)
        : "—"
  );
}

function bindExplainStatusUi(explainBundle) {
  const display = explainBundle?.ok ? explainBundle.display : null;
  if (!display) {
    setText("explain-overall", "—");
    setText("explain-confidence", "—");
    setText("explain-stage", "—");
    setText("explain-status", explainBundle?.status?.label || "未生成");
    setText("explain-stage-note", explainBundle?.stageNote || "");
    clearList("explain-important-list", "—");
    clearList("explain-contribution-list", "—");
    clearList("explain-diff-list", "—");
    return;
  }

  setText(
    "explain-status",
    explainBundle?.status?.label || "説明生成済"
  );
  setText("explain-overall", display.overallReason || "—");
  setText("explain-confidence", display.confidenceReason || "—");
  setText(
    "explain-stage",
    display.stageReason ||
      (display.stage != null ? `Stage${display.stage}` : "—")
  );
  setText("explain-stage-note", explainBundle?.stageNote || "");

  clearList("explain-important-list");
  const important = display.important || [];
  if (!important.length) {
    clearList("explain-important-list", "—");
  } else {
    important.forEach((t) => appendListItem("explain-important-list", t));
  }

  clearList("explain-contribution-list");
  const contribs = (display.contributions || []).filter((c) => c.percent > 0);
  if (!contribs.length) {
    clearList("explain-contribution-list", "—");
  } else {
    contribs.forEach((c) =>
      appendListItem("explain-contribution-list", `${c.label} ${c.percent}%`)
    );
  }

  clearList("explain-diff-list");
  const diffs = display.diffHighlights || [];
  if (!diffs.length) {
    clearList("explain-diff-list", "—");
  } else {
    diffs.forEach((t) => appendListItem("explain-diff-list", t));
  }
}

function bindExplainDevUi(explainBundle) {
  const dash = getExplainDashboard();
  setText(
    "dev-explain-status",
    explainBundle?.status?.label ||
      (explainBundle?.ok ? "OK" : "—")
  );
  setText(
    "dev-explain-validation",
    explainBundle?.validation?.ok
      ? `OK (warn ${explainBundle.validation.warnings?.length || 0})`
      : `NG ${explainBundle?.validation?.errors?.length || 0}`
  );
  setText(
    "dev-explain-updated",
    explainBundle?.fetchedAt
      ? formatUpdateTime(explainBundle.fetchedAt)
      : dash.updatedAt
        ? formatUpdateTime(dash.updatedAt)
        : "—"
  );

  clearList("dev-explain-contributions");
  const contribs = explainBundle?.contributions?.items || [];
  if (!explainBundle?.ok || !contribs.length) {
    clearList("dev-explain-contributions", "—");
  } else {
    contribs.forEach((c) =>
      appendListItem(
        "dev-explain-contributions",
        `${c.label}: ${c.percent}%`
      )
    );
  }

  clearList("dev-explain-evidence");
  const adopted = explainBundle?.evidenceView?.adopted || [];
  const excluded = explainBundle?.evidenceView?.excluded || [];
  if (!explainBundle?.ok) {
    clearList("dev-explain-evidence", "—");
  } else if (!adopted.length && !excluded.length) {
    clearList("dev-explain-evidence", "—");
  } else {
    adopted.slice(0, 8).forEach((e) =>
      appendListItem(
        "dev-explain-evidence",
        `採用 [${e.sourceLabel}] ${e.claim}`
      )
    );
    excluded.slice(0, 6).forEach((e) =>
      appendListItem(
        "dev-explain-evidence",
        `除外 [${e.sourceLabel}] ${e.claim}`
      )
    );
  }

  clearList("dev-explain-reasons");
  if (!explainBundle?.ok) {
    clearList("dev-explain-reasons", "—");
  } else {
    const overall = explainBundle.reasons?.overall?.text;
    if (overall) appendListItem("dev-explain-reasons", overall);
    (explainBundle.reasons?.plus || []).slice(0, 4).forEach((r) =>
      appendListItem("dev-explain-reasons", `＋ ${r.text}`)
    );
    (explainBundle.reasons?.minus || []).slice(0, 4).forEach((r) =>
      appendListItem("dev-explain-reasons", `− ${r.text}`)
    );
  }

  clearList("dev-explain-diff");
  const highlights = explainBundle?.diff?.highlights || [];
  const rankChanges = explainBundle?.diff?.rankChanges || [];
  if (!explainBundle?.ok) {
    clearList("dev-explain-diff", "—");
  } else {
    highlights.forEach((t) => appendListItem("dev-explain-diff", t));
    rankChanges.slice(0, 6).forEach((r) =>
      appendListItem("dev-explain-diff", r.text || String(r))
    );
    if (!highlights.length && !rankChanges.length) {
      clearList("dev-explain-diff", "—");
    }
  }
}

function bindKnowledgeStatusUi(knowledgeBundle) {
  const status = knowledgeBundle?.status || {};
  setText(
    "knowledge-status",
    status.label || (knowledgeBundle?.ok ? "Graph Ready" : "—")
  );
  setText(
    "knowledge-node-count",
    String(status.nodeCount ?? knowledgeBundle?.nodeCount ?? "—")
  );
  setText(
    "knowledge-edge-count",
    String(status.edgeCount ?? knowledgeBundle?.edgeCount ?? "—")
  );
  setText(
    "knowledge-score",
    status.knowledgeScore != null
      ? String(status.knowledgeScore)
      : knowledgeBundle?.knowledgeScore != null
        ? String(knowledgeBundle.knowledgeScore)
        : "—"
  );
  setText(
    "knowledge-updated",
    knowledgeBundle?.updatedAt
      ? formatUpdateTime(knowledgeBundle.updatedAt)
      : "—"
  );
  setText("knowledge-stage-note", knowledgeBundle?.stageNote || "");
}

function bindKnowledgeDevUi(knowledgeBundle) {
  const dash = getKnowledgeDashboard();
  setText(
    "dev-knowledge-status",
    knowledgeBundle?.status?.label ||
      (knowledgeBundle?.ok ? "OK" : "—")
  );
  setText(
    "dev-knowledge-nodes",
    String(knowledgeBundle?.nodeCount ?? dash.nodeCount ?? 0)
  );
  setText(
    "dev-knowledge-edges",
    String(knowledgeBundle?.edgeCount ?? dash.edgeCount ?? 0)
  );
  setText(
    "dev-knowledge-indexer",
    knowledgeBundle?.indexer?.status || dash.indexer?.status || "—"
  );
  setText(
    "dev-knowledge-query",
    knowledgeBundle?.queryState?.status ||
      dash.queryState?.status ||
      "—"
  );
  setText(
    "dev-knowledge-validation",
    knowledgeBundle?.validation?.ok
      ? `OK (warn ${knowledgeBundle.validation.warnings?.length || 0})`
      : `NG ${knowledgeBundle?.validation?.errors?.length || 0}`
  );
  setText(
    "dev-knowledge-sync",
    knowledgeBundle?.sync?.status || dash.sync?.status || "—"
  );
  setText(
    "dev-knowledge-updated",
    knowledgeBundle?.updatedAt
      ? formatUpdateTime(knowledgeBundle.updatedAt)
      : dash.updatedAt
        ? formatUpdateTime(dash.updatedAt)
        : "—"
  );
}

async function loadEngineSafe(scope, fn, fallback) {
  const result = await guardAsync(scope, fn, {
    timeoutMs: 15000,
    fallbackValue: fallback,
    userMessage: `${scope} のデータ取得に失敗しました。利用可能な範囲で分析を継続します。`,
  });
  return result.data ?? fallback;
}

function bindReleaseRcUi(meta = {}) {
  const info = getBuildInfo();
  setText("rc-version", `Version ${info.version}`);
  setText("rc-channel", info.channel || RELEASE_CHANNEL);
  setText("rc-build-date", `Build Date ${info.buildDate || BUILD_DATE}`);
  setText("rc-build-number", `Build ${info.buildNumber || BUILD_NUMBER}`);
  setText("dev-rc-version", `${VERSION} ${RELEASE_CHANNEL}`);
  setText("dev-rc-build-date", BUILD_DATE);
  setText("dev-rc-build-number", BUILD_NUMBER);
  const stats = getErrorStats();
  setText("dev-rc-errors", String(stats.errorCount));
  setText("dev-rc-warnings", String(stats.warningCount));
  setText("dev-rc-recoveries", String(stats.recoveries));
  setText(
    "dev-rc-perf",
    meta.analysisMs != null ? `${meta.analysisMs} ms` : "—"
  );
  setText(
    "dev-rc-note",
    meta.knowledgeSkipped
      ? "Knowledge sync skipped (unchanged)"
      : "RC quality guards active"
  );
}

function clearList(id, placeholder = null) {
  const el = document.getElementById(id);
  if (!el) return;
  clearElement(el);
  if (placeholder != null) {
    const li = document.createElement("li");
    li.textContent = placeholder;
    el.appendChild(li);
  }
}

function appendListItem(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  const li = document.createElement("li");
  li.textContent = text;
  el.appendChild(li);
}

async function renderProviderFrameworkTable(bundle) {
  const body = document.getElementById("dev-provider-framework");
  if (!body) return;
  try {
    await refreshProviderHealth();
  } catch {
    /* ignore */
  }
  const dash = getFrameworkDashboard();
  clearElement(body);
  const rows = dash.providers || [];
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "Provider なし";
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }

  const activeId = bundle?.providerId || dash.last?.providerId;
  for (const row of rows) {
    const tr = document.createElement("tr");
    if (row.id === activeId) tr.classList.add("is-active-provider");
    const countText =
      row.id === activeId
        ? String(bundle?.count?.horses ?? dash.last?.count?.horses ?? "—")
        : row.implemented
          ? "—"
          : "0";
    const cells = [
      row.label || row.id,
      row.health || "UNKNOWN",
      row.enabled ? "ON" : "OFF",
      row.implemented ? "YES" : "口のみ",
      countText,
    ];
    cells.forEach((text, idx) => {
      const td = document.createElement("td");
      td.textContent = text;
      if (idx === 1) {
        td.className = `v74-health status-${String(row.health || "UNKNOWN")
          .toLowerCase()
          .replace(/\s+/g, "-")}`;
      }
      tr.appendChild(td);
    });
    body.appendChild(tr);
  }
}

function bindDataErrorUi(bundle, raceNumber) {
  const banner = document.getElementById("data-error-banner");
  const detail = document.getElementById("data-error-detail");
  const retry = document.getElementById("data-retry-btn");
  if (!banner) return;

  const status = bundle.status || getDataStatus();
  const show = Boolean(status.error);
  banner.classList.toggle("is-visible", show);
  banner.hidden = !show;
  if (detail) {
    detail.textContent = status.usingCacheFallback
      ? `通信失敗のためキャッシュ表示中: ${status.error || ""}`
      : status.error || "通信に失敗しました";
  }

  if (retry && !retry.dataset.bound) {
    retry.dataset.bound = "1";
    retry.addEventListener("click", async () => {
      banner.classList.remove("is-visible");
      banner.hidden = true;
      clearDataCache();
      clearProviderCache();
      clearPlatformCache();
      const fresh = await loadRaceForAi({
        raceNumber,
        forceRefresh: true,
      });
      bindDataStatusUi(fresh.status);
      bindIntegrationDataUi(fresh);
      bindDeveloperPanel(fresh);
      if (fresh.status?.error && !(fresh.legacy?.horses || []).length) {
        banner.classList.add("is-visible");
        banner.hidden = false;
        if (detail) detail.textContent = fresh.status.error;
        return;
      }
      location.reload();
    });
  }
}

function bindIntelligenceScores(scores = {}, marketResult = null) {
  const market = marketResult?.scores || {};
  const finalIq = marketResult?.finalIq?.finalIqScore;

  setText("score-final-iq", formatScore(finalIq));
  setText("score-iq", formatScore(scores.iqScore));
  setText("score-pace", formatScore(scores.paceScore));
  setText("score-value", formatScore(scores.valueScore));
  setText("score-trust", formatScore(scores.trustScore));
  setText("score-danger", formatScore(scores.dangerScore));
  setText(
    "score-trend",
    formatScore(
      market.trendScore != null ? market.trendScore : scores.trendScore
    )
  );
  setText(
    "score-buzz",
    formatScore(market.buzzScore != null ? market.buzzScore : scores.buzzScore)
  );
  setText(
    "score-support",
    formatScore(
      market.supportScore != null ? market.supportScore : scores.supportScore
    )
  );
  setText(
    "score-risk",
    formatScore(market.riskScore != null ? market.riskScore : scores.riskScore)
  );
  setText("score-market-conf", formatScore(market.marketConfidence));
  setText("score-market-heat", formatScore(market.marketHeat));
  setText("score-public-exp", formatScore(market.publicExpectation));
  setText("score-value-opp", formatScore(market.valueOpportunity));
  setText(
    "score-sentiment",
    market.marketSentiment || scores.marketSentiment || "—"
  );
}

function bindMarketIntelligenceUi(marketResult = {}) {
  const scores = marketResult.scores || {};
  setGauge("support", scores.supportScore);
  setGauge("buzz", scores.buzzScore);
  setGauge("risk", scores.riskScore);
  setGauge("trend", scores.trendScore);
  setGauge("heat", scores.marketHeat);
  setGauge("value", scores.valueOpportunity);

  const explain = marketResult.explanations || {};
  setText(
    "market-explain-final",
    formatScore(marketResult.finalIq?.finalIqScore)
  );
  setText("market-explain-summary", explain.summary || "—");

  const list = document.getElementById("market-explain-list");
  if (list) {
    clearElement(list);
    const factors = Array.isArray(explain.factors) ? explain.factors : [];
    if (!factors.length) {
      const li = createElement("li");
      li.textContent = "市場根拠データ不足";
      list.appendChild(li);
    } else {
      for (const f of factors) {
        const li = createElement("li");
        const delta = Number(f.delta) || 0;
        const sign = delta > 0 ? `+${delta}` : String(delta);
        li.textContent = `・${f.label} ${sign}`;
        li.className = delta >= 0 ? "is-plus" : "is-minus";
        list.appendChild(li);
      }
    }
  }
}

function setGauge(key, value) {
  const n = Number(value);
  const pct = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  const fill = document.getElementById(`gauge-${key}`);
  const label = document.getElementById(`gauge-${key}-val`);
  if (fill) fill.style.width = `${pct}%`;
  if (label) label.textContent = Number.isFinite(n) ? String(Math.round(n)) : "—";
}

function bindIntelligenceEngineUi(engineResult = {}) {
  const confidence = engineResult.confidence || {};
  setText("ai-confidence-stars", confidence.starsLabel || "★★★☆☆");
  setText(
    "ai-confidence-pct",
    confidence.percent != null ? `${confidence.percent}%` : "—%"
  );
  setText("ai-confidence-note", confidence.note || "");

  const explain = engineResult.explanations || {};
  setText("explain-iq", formatScore(explain.iqScore));
  setText(
    "explain-focus",
    explain.focusHorse
      ? `注目馬: ${explain.focusNumber || ""} ${explain.focusHorse}`
      : "—"
  );
  const list = document.getElementById("explain-list");
  if (list) {
    clearElement(list);
    const factors = Array.isArray(explain.factors) ? explain.factors : [];
    if (!factors.length) {
      const li = createElement("li");
      li.textContent = "根拠データ不足";
      list.appendChild(li);
    } else {
      for (const f of factors) {
        const li = createElement("li");
        const delta = Number(f.delta) || 0;
        const sign = delta > 0 ? `+${delta}` : String(delta);
        li.textContent = `・${f.label} ${sign}`;
        li.className = delta >= 0 ? "is-plus" : "is-minus";
        list.appendChild(li);
      }
    }
  }

  setText(
    "v53-ai-comment",
    engineResult.comments?.full || "—"
  );

  const report = engineResult.report || {};
  setText("report-overview", report.overview || "—");
  setText("report-pace", report.pace || "—");
  setText(
    "report-danger",
    report.danger
      ? `${report.danger.number} ${report.danger.name}（${report.danger.reason}）`
      : "—"
  );
  setText(
    "report-upset",
    report.upset
      ? `${report.upset.number} ${report.upset.name}（${report.upset.reason}）`
      : "—"
  );

  const evBox = document.getElementById("report-ev-rank");
  if (evBox) {
    clearElement(evBox);
    const rows = Array.isArray(report.evRanking) ? report.evRanking : [];
    if (!rows.length) {
      const li = createElement("li");
      li.textContent = "—";
      evBox.appendChild(li);
    } else {
      for (const row of rows) {
        const li = createElement("li");
        li.textContent = `${row.rank}. ${row.number} ${row.name}  EV ${row.expectedValue} / オッズ ${row.odds}`;
        evBox.appendChild(li);
      }
    }
  }

  const ticketBox = document.getElementById("report-tickets");
  if (ticketBox) {
    clearElement(ticketBox);
    const tickets = Array.isArray(report.tickets) ? report.tickets : [];
    if (!tickets.length) {
      const li = createElement("li");
      li.textContent = "—";
      ticketBox.appendChild(li);
    } else {
      for (const t of tickets) {
        const li = createElement("li");
        li.textContent = `${t.type} ${t.text}（${t.note || ""}）`;
        ticketBox.appendChild(li);
      }
    }
  }
}

function bindAnalysisStageUi(raceCtx) {
  if (!raceCtx) return;
  const stage = raceCtx.analysisStage;
  setText(
    "stage-current",
    stage ? `Stage${stage.stage}` : "—"
  );
  setText("stage-confirmed", stage?.confirmedLabel || "—");
  setText("stage-confidence", raceCtx.confidence?.label || "—");
  setText("stage-completeness", raceCtx.completeness?.label || "—");
  setText("stage-mode", raceCtx.notice?.mode || "—");
  setText("stage-provisional", raceCtx.notice?.provisional || "");
  setText("stage-note", raceCtx.notice?.note || "");

  const pending = document.getElementById("stage-pending");
  if (pending) {
    clearElement(pending);
    const items = raceCtx.notice?.pending || raceCtx.completeness?.pendingFields || [];
    if (!items.length) {
      const li = document.createElement("li");
      li.textContent = "なし（最終段階）";
      pending.appendChild(li);
    } else {
      items.forEach((label) => {
        const li = document.createElement("li");
        li.textContent = label;
        pending.appendChild(li);
      });
    }
  }
}

function bindUpdateStatusUi() {
  const status = getUpdateStatus();
  setText("ai-update-status", status.statusLabel || status.status || "—");
  setText("ai-update-next", status.nextUpdateLabel || status.schedule?.statusLabel || "—");
  setText("ai-update-auto", status.autoUpdate ? "ON" : "OFF");
  setText("dev-auto-update", status.autoUpdate ? "ON" : "OFF");
  setText("dev-scheduler-phase", status.schedule?.phaseLabel || "—");
  setText("dev-watch-count", String((status.watchTargets || []).length));
  if (status.lastReason && status.lastReason !== "—") {
    setText("ai-update-reason", status.lastReason);
  }
}

function bindSmartUpdateDevControls() {
  const panel = document.getElementById("dev-data-panel");
  if (!panel || panel.hidden) return;

  document.querySelectorAll("[data-auto-update]").forEach((btn) => {
    const on = btn.getAttribute("data-auto-update") === "on";
    btn.classList.toggle("is-active", on === getAutoUpdate());
    if (btn.dataset.boundUpdate) return;
    btn.dataset.boundUpdate = "1";
    btn.addEventListener("click", () => {
      setAutoUpdate(on);
      bindUpdateStatusUi();
      document.querySelectorAll("[data-auto-update]").forEach((b) => {
        b.classList.toggle(
          "is-active",
          (b.getAttribute("data-auto-update") === "on") === getAutoUpdate()
        );
      });
    });
  });

  const mockBox = document.getElementById("dev-mock-events");
  if (mockBox && !mockBox.dataset.bound) {
    mockBox.dataset.bound = "1";
    clearElement(mockBox);
    listMockEventTypes().forEach((ev) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "v70-source-btn";
      btn.textContent = ev.label;
      btn.addEventListener("click", () => {
        fireMockEvent(ev.type);
        setTimeout(bindUpdateStatusUi, 40);
      });
      mockBox.appendChild(btn);
    });
  }

  const tickBtn = document.getElementById("dev-schedule-tick");
  if (tickBtn && !tickBtn.dataset.bound) {
    tickBtn.dataset.bound = "1";
    tickBtn.addEventListener("click", () => {
      tickSchedule(true);
      setTimeout(bindUpdateStatusUi, 40);
    });
  }

  bindUpdateStatusUi();
}

function formatScore(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return String(Number(value));
}

function bindDeveloperPanel(bundle, intelPacket = null, marketResult = null) {
  const panel = document.getElementById("dev-data-panel");
  if (!panel) return;
  const enabled = Boolean(DEBUG || DEBUG_MODE);
  panel.hidden = !enabled;
  panel.classList.toggle("is-visible", enabled);
  if (!enabled) return;

  const status = bundle.status || getDataStatus();
  setText("dev-provider", status.providerId || "—");
  setText("dev-source", status.sourceLabel || "—");
  setText("dev-source-mode", status.sourceMode || getSourceMode() || "—");
  setText(
    "dev-cache",
    status.fromCache
      ? status.usingCacheFallback
        ? "HIT (fallback)"
        : "HIT"
      : "MISS"
  );
  setText("dev-updated", status.updatedLabel || "—");
  setText(
    "dev-count",
    `races ${status.count?.races || 0} / horses ${status.count?.horses || 0}`
  );

  const vs = intelPacket?.validationSummary;
  setText(
    "dev-validation",
    vs
      ? `issues ${vs.issueCount} (missing ${vs.missing} / anomaly ${vs.anomaly} / dup ${vs.duplicate})`
      : "—"
  );

  renderIntelStatus(intelPacket);
  renderIntelLogs(intelPacket);
  renderProviderMonitor(intelPacket);
  renderMarketMonitor(marketResult);
  bindProviderFrameworkUi(bundle);
  setText(
    "dev-market-cache",
    marketResult?.cache?.status
      ? `${marketResult.cache.status} @ ${
          marketResult.cache.updatedAt
            ? formatUpdateTime(marketResult.cache.updatedAt)
            : "—"
        }`
      : "—"
  );
  setText(
    "dev-final-iq",
    formatScore(marketResult?.finalIq?.finalIqScore)
  );
  bindDebugPanel(intelPacket);

  const clearBtn = document.getElementById("dev-clear-cache");
  if (clearBtn && !clearBtn.dataset.bound) {
    clearBtn.dataset.bound = "1";
    clearBtn.addEventListener("click", () => {
      clearDataCache();
      clearProviderCache();
      clearAllIntelligenceState();
      clearPlatformCache();
      setText("dev-cache", "CLEARED");
      const view = document.getElementById("dev-debug-view");
      if (view) view.textContent = "cache cleared";
    });
  }

  bindSourceModeControls();
  // Ver9.0: Dev Panel 表示時に RC エラー件数を最新化
  bindReleaseRcUi();

  const forceBtn = document.getElementById("dev-force-error");
  if (forceBtn && !forceBtn.dataset.bound) {
    forceBtn.dataset.bound = "1";
    forceBtn.addEventListener("click", () => {
      const url = new URL(window.location.href);
      url.searchParams.set("forceError", "1");
      window.location.href = url.toString();
    });
  }
}

function bindSourceModeControls() {
  const wrap = document.getElementById("dev-source-mode-controls");
  if (!wrap) return;
  const current = getSourceMode();
  setText("dev-source-mode", current);
  wrap.querySelectorAll("[data-source-mode]").forEach((btn) => {
    const mode = btn.getAttribute("data-source-mode");
    btn.classList.toggle("is-active", mode === current);
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      const next = setSourceMode(mode);
      clearPlatformCache();
      setText("dev-source-mode", next);
      wrap.querySelectorAll("[data-source-mode]").forEach((b) => {
        b.classList.toggle(
          "is-active",
          b.getAttribute("data-source-mode") === next
        );
      });
      const note = document.getElementById("dev-source-mode-note");
      if (note) {
        note.textContent =
          next === "real"
            ? "Real: Provider未接続（現段階では Mock のみ動作）"
            : next === "auto"
              ? "Auto: Real 未接続のため Mock へフォールバック"
              : "Mock: ローカルJSONを使用";
      }
      // 反映のため再読込
      location.reload();
    });
  });
}

function renderMarketMonitor(marketResult) {
  const body = document.getElementById("dev-market-monitor");
  if (!body) return;
  clearElement(body);
  const rows = marketResult?.analyzerStates || [];
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "Market Analyzer なし";
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }
  for (const row of rows) {
    const tr = document.createElement("tr");
    const cells = [
      row.name || "—",
      row.status || "—",
      String(row.fetchedCount != null ? row.fetchedCount : "—"),
      String(row.analyzedCount != null ? row.analyzedCount : "—"),
      row.updatedAt ? formatUpdateTime(row.updatedAt) : "—",
      String(row.responseMs != null ? row.responseMs : "—"),
    ];
    cells.forEach((text, idx) => {
      const td = document.createElement("td");
      td.textContent = text;
      if (idx === 1) {
        td.className = `v52-monitor-status status-${String(row.status || "")
          .toLowerCase()
          .replace(/\s+/g, "-")}`;
      }
      tr.appendChild(td);
    });
    body.appendChild(tr);
  }
}

function renderProviderMonitor(intelPacket) {
  const body = document.getElementById("dev-provider-monitor");
  if (!body) return;
  clearElement(body);

  const rows = intelPacket?.monitor || [];
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "モニタなし";
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }

  for (const row of rows) {
    const tr = document.createElement("tr");
    const cells = [
      row.label || row.providerId,
      row.status || "—",
      row.lastFetchedAt ? formatUpdateTime(row.lastFetchedAt) : "—",
      String(row.lastCount != null ? row.lastCount : "—"),
      String(row.errorCount != null ? row.errorCount : 0),
      String(row.lastResponseMs != null ? row.lastResponseMs : "—"),
    ];
    cells.forEach((text, idx) => {
      const td = document.createElement("td");
      td.textContent = text;
      if (idx === 1) {
        td.className = `v52-monitor-status status-${String(row.status || "")
          .toLowerCase()
          .replace(/\s+/g, "-")}`;
      }
      tr.appendChild(td);
    });
    body.appendChild(tr);
  }
}

function bindDebugPanel(intelPacket) {
  const view = document.getElementById("dev-debug-view");
  const tabs = document.querySelectorAll(".v52-debug-tab");
  if (!view) return;

  const snapshot = intelPacket?.debug || getDebugSnapshot() || {};
  panelDebugState.snapshot = snapshot;
  if (!panelDebugState.mode) panelDebugState.mode = "raw";

  renderDebugView(panelDebugState.mode, snapshot);

  tabs.forEach((tab) => {
    if (tab.dataset.bound) return;
    tab.dataset.bound = "1";
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      panelDebugState.mode = tab.dataset.debug || "raw";
      renderDebugView(panelDebugState.mode, panelDebugState.snapshot);
    });
  });
}

const panelDebugState = { mode: "raw", snapshot: null };

function renderDebugView(mode, snapshot) {
  const view = document.getElementById("dev-debug-view");
  if (!view) return;
  const data = snapshot || {};
  let payload = null;
  if (mode === "normalized") {
    payload = {
      counts: data.normalizedCounts || {},
      sample: data.normalizedSample || data.normalized || {},
      validations: data.validations || [],
    };
  } else if (mode === "cache") {
    payload = data.cache || [];
  } else {
    payload = {
      collectedAt: data.collectedAt,
      providers: data.providers || [],
      rawSample: data.rawSample || data.rawByProvider || {},
    };
  }
  try {
    view.textContent = JSON.stringify(payload, null, 2);
  } catch {
    view.textContent = String(payload);
  }
}

function renderIntelStatus(intelPacket) {
  const list = document.getElementById("dev-intel-status");
  if (!list) return;
  clearElement(list);

  const metas = getProviderMetas();
  const runtime = new Map(
    (intelPacket?.providers || []).map((p) => [p.providerId, p])
  );

  for (const meta of metas) {
    const runtimeRow = runtime.get(meta.id);
    const status = runtimeRow?.status || meta.status || "READY";
    const li = createElement("li", {
      className: `v51-intel-status__item status-${String(status).toLowerCase()}`,
    });
    const name = createElement("span", { className: "v51-intel-status__name" });
    name.textContent = meta.implemented === false ? `${meta.label} (TODO)` : meta.label;
    const badge = createElement("span", {
      className: `v51-status-badge v51-status-badge--${String(status)
        .toLowerCase()
        .replace(/\s+/g, "-")}`,
    });
    badge.textContent = status;
    li.append(name, badge);
    list.appendChild(li);
  }
}

function renderIntelLogs(intelPacket) {
  const box = document.getElementById("dev-intel-logs");
  if (!box) return;
  clearElement(box);

  const rows = (intelPacket?.providers || []).slice(0, 12);
  if (!rows.length) {
    box.textContent = "ログなし";
    return;
  }

  for (const row of rows) {
    const line = createElement("p", { className: "v51-intel-logs__row" });
    const updated = row.updatedAt ? formatUpdateTime(row.updatedAt) : "—";
    line.textContent = `${row.label} · ${row.count}件 · ${updated} · cache ${row.cacheStatus || "—"} · ${row.responseMs || 0}ms · ${row.status}`;
    box.appendChild(line);
  }
}

export function renderAnalysis(result, race = {}) {
  const reports = enrichMarks(
    result.horseReports || result.horses || [],
    result.horses || [],
    race,
    result.paceForecast || {}
  );
  const overall = result.overall || {};
  cachedTickets = result.tickets || null;

  const meta = document.getElementById("paper-race-meta");
  if (meta) {
    meta.textContent = [
      race.venueLabel || race.venue || "",
      race.number != null ? `${race.number}R` : "",
      race.name || "",
      race.distance ? `${race.distance}m` : "",
      race.track || "",
      race.trackCondition || "",
    ]
      .filter(Boolean)
      .join(" ｜ ");
  }

  renderSimulation(reports);
  renderDeepComment(result, reports, race);
  renderUpsetSpotlight(result, reports);
  renderDangerAlerts(reports);
  renderEvList(reports);

  document.getElementById("overall-grade").textContent = overall.grade || "-";
  animateCount(
    document.getElementById("overall-confidence"),
    Number(overall.confidence) || 0,
    "%",
    900
  );
  animateConfidenceRing(Number(overall.confidence) || 0);
  animateOverallGauge(gradeToGauge(overall.grade), Number(overall.confidence) || 0);

  const confBar = document.getElementById("overall-confidence-bar");
  if (confBar) {
    requestAnimationFrame(() => {
      confBar.style.width = `${clamp(overall.confidence || 0, 0, 100)}%`;
    });
  }

  animateCount(
    document.getElementById("overall-return"),
    Number(overall.expectedReturn) || 0,
    "%",
    1000
  );
  const returnBar = document.getElementById("overall-return-bar");
  if (returnBar) {
    requestAnimationFrame(() => {
      returnBar.style.width = `${clamp(overall.expectedReturn || 0, 0, 100)}%`;
    });
  }

  document.getElementById("overall-risk").textContent = overall.risk || "-";
  document.getElementById("overall-comment").textContent =
    overall.comment || "";

  renderPaceForecast(result);
  renderWinRank(reports);
  renderPaceLanes(result.paceLanes || []);
  drawCourseMap(document.getElementById("course-canvas"), result);
  renderTimeline(result, reports);
  renderMarks(reports);
  renderSpotlight(result, reports);
  renderHorseDeepList(reports.slice(0, 8));
  renderIndexTable(reports);
  renderIndexCards(reports);

  drawRadarChart(document.getElementById("radar-chart"), result.radar);
  drawBarChart(document.getElementById("bar-chart"), reports.slice(0, 8));
  drawLineChart(document.getElementById("line-chart"), reports.slice(0, 8));
  drawPieChart(document.getElementById("pie-chart"), result.paceForecast);

  renderStyleDistribution(result.paceLanes || [], result.paceForecast);
  renderAbilityBars(reports.slice(0, 6));

  selectedTicketType = result.tickets?.defaultType || "三連複";
  selectedStrategy = "AIおすすめ";
  renderTicketTabs(result.tickets);
  renderTicketBets(result.tickets);

  appendLines(
    document.getElementById("analysis-ai-comment"),
    result.aiComment || []
  );
  document.getElementById("pace-scenario-text").textContent =
    result.paceScenario || "";
  document.getElementById("final-comment-text").textContent =
    result.finalComment || "";

  debateContext = { reports, result, race };
  applyCardStagger();
}

/* ---------- Ver3.2 display enrich (no AI engine changes) ---------- */

function enrichMarks(list, sourceHorses = [], race = {}, pace = {}) {
  const ranked = [...list].sort(
    (a, b) =>
      (b.thinking?.score || b.aiIndex || 0) -
        (a.thinking?.score || a.aiIndex || 0) ||
      (b.indexes?.total || 0) - (a.indexes?.total || 0)
  );
  const marks = ["◎", "○", "▲", "△", "☆"];
  return ranked.map((horse, index) => {
    const source =
      sourceHorses.find((h) => h.number === horse.number) || horse;
    let mark =
      horse.mark && ["◎", "〇", "○", "▲", "△", "☆", "注"].includes(horse.mark)
        ? horse.mark
        : index < marks.length
          ? marks[index]
          : "×";
    if (mark === "〇") mark = "○";
    if (mark === "注") mark = "×";
    const reason =
      horse.roleComment ||
      horse.comments?.[0] ||
      defaultMarkReason(mark);

    const indexFromTotal = Math.round((horse.indexes?.total || 0) / 10);
    const indexFromThinking = Math.round(horse.thinking?.score || 0);
    const aiIndex =
      horse.aiIndex != null
        ? horse.aiIndex
        : indexFromTotal || indexFromThinking;
    const expectedValuePercent =
      horse.expectedValuePercent != null
        ? horse.expectedValuePercent
        : Math.round(((horse.indexes?.expectedValue || 500) / 10) * 1.5);

    const winPct = toNum(
      horse.probability?.win,
      Number(horse.winRate) || Math.max(1, aiIndex / 4)
    );
    const placePct = toNum(
      horse.probability?.place,
      clamp(winPct * 2.1, winPct, 92)
    );
    const showPct = toNum(
      horse.probability?.show,
      clamp(winPct * 1.55, winPct, 78)
    );

    const odds = Math.max(1.1, Number(source.odds || horse.odds) || 10);
    const popularity = Number(horse.popularity || source.popularity) || 99;
    const evFromOdds = Math.round((winPct / 100) * odds * 100);
    const evScore =
      horse.expectedValuePercent != null
        ? Math.round((Number(horse.expectedValuePercent) + evFromOdds) / 2)
        : evFromOdds;
    const evTone = evToneFromScore(evScore);

    const radar5 = buildRadar5(horse, source);
    const aptitude = buildAptitude(horse, source, race);
    const alerts = buildDangerAlerts(horse, source, race, pace, {
      winPct,
      popularity,
      odds,
      index,
    });

    return {
      ...source,
      ...horse,
      paperMark: mark,
      markClass: MARK_CLASS[mark] || "x",
      markReason: reason,
      aiIndex,
      expectedValuePercent,
      winPct: round1(winPct),
      placePct: round1(placePct),
      showPct: round1(showPct),
      odds,
      popularity,
      evScore,
      evTone,
      radar5,
      aptitude,
      alerts,
      risk: horse.risk || horse.riskLabel || "Medium",
      runningStyle: horse.runningStyle || source.runningStyle || "差し",
      horse: horse.horse || source.horse,
      number: horse.number != null ? horse.number : source.number,
    };
  });
}

function defaultMarkReason(mark) {
  if (mark === "◎") return "思考評価・指数ともに最上位。軸候補。";
  if (mark === "○") return "本命に続く安定感。対抗向き。";
  if (mark === "▲") return "相手関係で評価。ヒモ候補。";
  if (mark === "△") return "展開次第で食い込み可能。";
  if (mark === "☆") return "人気薄だが期待値あり。穴印。";
  return "今回は評価を抑えめ。見送り寄り。";
}

function buildRadar5(horse, source) {
  const bd = horse.breakdown || {};
  const idx = horse.indexes || source.indexes || {};
  const style = horse.runningStyle || source.runningStyle || "差し";
  const speed = clamp(
    Number(bd.speed) || indexTo100(idx.speed) || Number(horse.aiIndex) || 60,
    20,
    99
  );
  let front = Number(bd.pace) || indexTo100(idx.pace) || 55;
  if (style === "逃げ") front = clamp(front + 12, 20, 99);
  else if (style === "先行") front = clamp(front + 6, 20, 99);
  else if (style === "追込") front = clamp(front - 8, 20, 99);
  const burst = clamp(
    Number(bd.burst) || indexTo100(idx.burst) || 55,
    20,
    99
  );
  const stamina = clamp(
    Number(bd.stamina) ||
      Number(bd.durability) ||
      indexTo100(idx.stamina) ||
      55,
    20,
    99
  );
  const stability = clamp(
    indexTo100(idx.stability) || Number(horse.confidence) || 60,
    20,
    99
  );
  return [speed, front, burst, stamina, stability].map((v) => Math.round(v));
}

function buildAptitude(horse, source, race) {
  const ratings = horse.ratings || {};
  const courseBase = starsToNum(ratings.course, 3);
  const trackBase = starsToNum(ratings.track, 3);
  const last = String(source.lastRace || horse.lastRace || "");
  const venueNow = String(race.venueLabel || race.venue || "");
  const conditionNow = String(race.trackCondition || "良");
  const seed = Number(horse.number) || 1;

  const course = VENUES.map((name, i) => {
    let stars = courseBase;
    if (last.includes(name)) stars += 1;
    if (venueNow.includes(name)) stars += 1;
    stars += ((seed + i * 3) % 3) - 1;
    return { name, stars: clamp(stars, 1, 5) };
  });

  const track = CONDITIONS.map((name, i) => {
    let stars = trackBase;
    if (name === "良") stars += 1;
    if (name === conditionNow) stars += 1;
    if (name === "不良") stars -= 1;
    if ((source.trackType || horse.trackType) === "ダート" && name !== "良") {
      stars += 1;
    }
    stars += ((seed + i * 2) % 2) - 0;
    return { name, stars: clamp(stars, 1, 5) };
  });

  return { course, track };
}

function buildDangerAlerts(horse, source, race, pace, ctx) {
  const alerts = [];
  const style = horse.runningStyle || source.runningStyle || "差し";
  const minus = horse.minusFactors || [];
  const oddsLabel = horse.oddsLabel || "";
  const venue = String(race.venueLabel || "");
  const distType = source.distanceType || horse.distanceType || "";
  const raceDist = Number(race.distance) || 1600;

  if (ctx.popularity <= 3 && ctx.winPct < 18) {
    alerts.push({
      label: "人気先行",
      tone: "red",
      reason: "人気に対して推定勝率が追いついていません。",
    });
  }
  if (oddsLabel === "危険人気" || horse.role === "危険人気馬") {
    alerts.push({
      label: "人気先行",
      tone: "red",
      reason: "AI判定で危険人気に分類されています。",
    });
  }
  if (
    (distType === "短距離" && raceDist >= 1800) ||
    (distType === "長距離" && raceDist <= 1400) ||
    minus.some((m) => String(m).includes("距離"))
  ) {
    alerts.push({
      label: "距離不安",
      tone: "yellow",
      reason: "今回の距離との噛み合わせに不安があります。",
    });
  }
  if (
    (source.trackType || horse.trackType) &&
    race.track &&
    (source.trackType || horse.trackType) !== race.track
  ) {
    alerts.push({
      label: "馬場不安",
      tone: "yellow",
      reason: "芝ダ適性のズレが懸念されます。",
    });
  }
  if (
    String(pace.pace || "").includes("ハイ") &&
    (style === "逃げ" || style === "先行")
  ) {
    alerts.push({
      label: "展開不利",
      tone: "blue",
      reason: "ハイペース想定で先行負担が増えやすい形です。",
    });
  }
  if (
    String(pace.pace || "").includes("スロー") &&
    (style === "差し" || style === "追込")
  ) {
    alerts.push({
      label: "展開不利",
      tone: "blue",
      reason: "スロー想定では後方待機が届きにくい展開です。",
    });
  }
  if ((Number(source.frame) || 0) >= 7 && style === "逃げ") {
    alerts.push({
      label: "スタート不安",
      tone: "yellow",
      reason: "外枠逃げはハナ争いでロスが出やすい配置です。",
    });
  }
  if (venue.includes("中山") || venue.includes("小倉")) {
    if (seedBit(horse.number, 1) && style === "差し") {
      alerts.push({
        label: "右回り苦手",
        tone: "blue",
        reason: "右回りコースでの脚の出し方にばらつきがあります。",
      });
    }
  }
  if (venue.includes("京都") || venue.includes("阪神")) {
    if (seedBit(horse.number, 2) && style === "追込") {
      alerts.push({
        label: "左回り苦手",
        tone: "blue",
        reason: "左回りでの直線の加速にムラが見えます。",
      });
    }
  }
  if (
    (Number(horse.indexes?.stability) || 500) < 460 ||
    minus.some((m) => String(m).includes("折り合い"))
  ) {
    alerts.push({
      label: "折り合い課題",
      tone: "yellow",
      reason: "気性面・折り合いの課題が残りやすいタイプです。",
    });
  }

  const uniq = [];
  const seen = new Set();
  alerts.forEach((a) => {
    if (seen.has(a.label)) return;
    seen.add(a.label);
    uniq.push(a);
  });
  return uniq.slice(0, 4);
}

function seedBit(num, bit) {
  return ((Number(num) || 0) + bit) % 3 === 0;
}

function evToneFromScore(score) {
  if (score >= 100) return "buy";
  if (score >= 75) return "watch";
  return "skip";
}

function evLabel(tone) {
  if (tone === "buy") return "買い";
  if (tone === "watch") return "様子見";
  return "見送り";
}

/* ---------- Section renderers ---------- */

function renderSimulation(reports) {
  const top = reports[0];
  if (!top) return;

  setText(
    "sim-focus-horse",
    `${top.paperMark} ${top.number}番 ${top.horse}`
  );
  setText(
    "sim-lead",
    `${top.horse}を基準に、AI評価値から1000回レースを想定した分布です`
  );

  animateCount(document.getElementById("sim-win"), top.winPct, "", 1100, true);
  animateCount(document.getElementById("sim-place"), top.placePct, "", 1200, true);
  animateCount(document.getElementById("sim-show"), top.showPct, "", 1300, true);
  animateCount(document.getElementById("sim-ev"), top.evScore, "", 1400, false);

  setBar("sim-win-bar", top.winPct);
  setBar("sim-place-bar", top.placePct);
  setBar("sim-show-bar", top.showPct);
  setBar("sim-ev-bar", clamp(top.evScore / 2, 0, 100));

  const rows = document.getElementById("sim-rows");
  if (!rows) return;
  clearElement(rows);
  const maxWin = Math.max(...reports.slice(0, 6).map((h) => h.winPct), 1);
  reports.slice(0, 6).forEach((horse) => {
    const fill = createElement("span", { className: "sim-row__fill" });
    rows.appendChild(
      createElement("div", {
        className: "sim-row",
        children: [
          createElement("span", {
            className: `sim-row__mark mark--${horse.markClass}`,
            text: horse.paperMark,
          }),
          createElement("div", {
            children: [
              createElement("p", {
                className: "sim-row__name",
                text: `${horse.number}番 ${horse.horse}`,
              }),
              createElement("div", {
                className: "sim-row__track",
                children: [fill],
              }),
            ],
          }),
          createElement("span", {
            className: "sim-row__pct",
            text: `${horse.winPct.toFixed(1)}%`,
          }),
        ],
      })
    );
    requestAnimationFrame(() => {
      fill.style.width = `${clamp((horse.winPct / maxWin) * 100, 6, 100)}%`;
    });
  });
}

function renderDeepComment(result, reports, race) {
  const root = document.getElementById("deep-ai-comment");
  if (!root) return;
  clearElement(root);
  const blocks = buildDeepAiComment(result, reports, race);
  blocks.forEach((block) => {
    root.appendChild(
      createElement("div", {
        className: "deep-comment__block",
        children: [
          createElement("h3", { text: block.title }),
          createElement("p", { text: block.text }),
        ],
      })
    );
  });
}

function buildDeepAiComment(result, reports, race) {
  const pace = result.paceForecast || {};
  const top = reports[0] || {};
  const second = reports[1] || {};
  const third = reports[2] || {};
  const closer = reports.find(
    (h) => h.runningStyle === "差し" || h.runningStyle === "追込"
  );
  const nige = reports.find((h) => h.runningStyle === "逃げ");
  const venue = race.venueLabel || race.venue || "開催場";
  const dist = race.distance ? `${race.distance}m` : "今回距離";
  const condition = race.trackCondition || "良";
  const track = race.track || "芝";
  const paceLabel = pace.pace || "平均";
  const adv = pace.advantage || "先行有利";
  const plus =
    (top.plusFactors || []).slice(0, 3).join("、") || "指数上位の安定感";
  const minus =
    (top.minusFactors || []).slice(0, 2).join("、") ||
    (top.alerts?.[0]?.label || "大きな減点は限定的");
  const frame = top.frame != null ? `${top.frame}枠` : "枠順";
  const jockey = top.jockey || "主戦騎手";
  const odds = top.odds != null ? `${top.odds}倍` : "オッズ";
  const variant = (Number(race.number) || 1) + (top.number || 0);
  const openers = [
    "総合すると今回は",
    "現場目線でも",
    "数値と展開を重ねると",
    "AIの統合見解では",
  ];
  const closerPhrases = [
    "配分は軸を厚く、穴は相手へ。",
    "単勝一点突破より、連系で幅を持たせるのが無難です。",
    "信頼度の高い軸に、妙味馬を絡める形が合理的です。",
  ];
  const opener = openers[variant % openers.length];
  const closerLine = closerPhrases[variant % closerPhrases.length];

  return [
    {
      title: "展開",
      text: `${venue}${dist}（${track}／${condition}）。脚質分布は逃げ${pace.nige || 0}・先行${pace.senkou || 0}・差し${pace.sashi || 0}・追込${pace.oikomi || 0}で、${adv}の構図が基本。${opener}${top.horse || "上位馬"}を軸に、${second.horse || "対抗"}〜${third.horse || "穴候補"}までを相手候補に置くのが自然です。`,
    },
    {
      title: "馬場",
      text: `${condition}馬場では${
        condition === "良"
          ? "スピード負けしにくい馬が残りやすく、直線の加速勝負になりやすい"
          : "パワーとスタミナの比重が増し、馬場適性の差が出やすい"
      }。${track}適性の高い馬ほど評価を維持しやすく、${top.horse || "本命"}の馬場適性も加点材料です。`,
    },
    {
      title: "脚質",
      text: nige
        ? `${nige.number}番${nige.horse}がハナを主張しやすく、${paceLabel}ペースへ。${top.runningStyle || "差し"}の${top.horse || "本命"}は${
            top.runningStyle === "逃げ" || top.runningStyle === "先行"
              ? "先団で競馬を進められるかが勝ち切れの条件"
              : "中団〜後方から直線で外へ出せるかが焦点"
          }。${closer ? `${closer.number}番の末脚も警戒材料です。` : ""}`
        : `逃げ不在気味でペースが落ち着く可能性。好位争いになった場合、脚質の柔軟な${top.horse || "上位馬"}が有利です。`,
    },
    {
      title: "騎手・枠順",
      text: `${top.horse || "本命"}は${frame}${top.number || ""}番、鞍上は${jockey}。枠の内外でロスを抑えつつ、${
        Number(top.frame) >= 7
          ? "外枠なりにポジションを取りにいく判断が重要"
          : "内目を活かしたスムーズな競馬が理想"
      }。騎手補正込みでも総合評価は上位を維持しています。`,
    },
    {
      title: "オッズ・期待値",
      text: `想定オッズは${odds}前後。推定勝率${top.winPct || 0}%に対しEV${top.evScore || 0}%で、${
        (top.evTone || "") === "buy"
          ? "買い目としての妙味が残る水準"
          : (top.evTone || "") === "watch"
            ? "様子見ゾーンだが連系での価値は十分"
            : "単勝偏重は避け、相手候補として扱うのが無難"
      }。人気${top.popularity || "-"}番手とのギャップも確認材料です。`,
    },
    {
      title: "期待材料",
      text: `${plus}が光る内容で、シミュレーションでも勝率${top.winPct || 0}%・連対${top.placePct || 0}%と上位。危険側は${result.dangerHorse?.horse || "人気先行馬"}、穴側は${result.upsetHorse?.horse || "期待値上位の人気薄"}を意識してください。`,
    },
    {
      title: "不安材料と結論",
      text: `${minus}は割り引きつつも、全体の結論は崩れにくい。${opener}◎${top.number || ""}番を軸に○▲を厚く、☆はヒモ〜穴へ。${closerLine}`,
    },
  ];
}

function renderUpsetSpotlight(result, reports) {
  const root = document.getElementById("upset-spotlight");
  if (!root) return;
  clearElement(root);

  const byEv = [...reports]
    .filter((h) => Number(h.popularity) >= 5)
    .sort((a, b) => b.evScore - a.evScore || b.winPct - a.winPct);

  const named = result.upsetHorse?.horse
    ? reports.find((h) => h.horse === result.upsetHorse.horse)
    : null;

  const picks = [];
  if (named) picks.push(named);
  byEv.forEach((h) => {
    if (picks.length >= 2) return;
    if (picks.some((p) => p.number === h.number)) return;
    picks.push(h);
  });

  if (!picks.length) {
    root.appendChild(
      createElement("p", {
        className: "paper-section__lead",
        text: "条件を満たす注目穴馬は検出されませんでした。",
      })
    );
    return;
  }

  picks.forEach((horse) => {
    const reason =
      horse.roleComment ||
      result.upsetHorse?.reason ||
      `人気${horse.popularity}番手ながらEV${horse.evScore}%・勝率${horse.winPct}%と妙味。`;
    root.appendChild(
      createElement("article", {
        className: "upset-card glass-card",
        children: [
          createElement("p", {
            className: "upset-card__tag",
            text: "AI注目穴馬",
          }),
          createElement("h3", {
            className: "upset-card__horse",
            text: `${horse.paperMark} ${horse.number}番 ${horse.horse}`,
          }),
          createElement("p", {
            className: "upset-card__meta",
            text: `${horse.popularity}番人気 ／ オッズ ${horse.odds}倍 ／ EV ${horse.evScore}%`,
          }),
          createElement("p", {
            className: "upset-card__reason",
            text: reason,
          }),
        ],
      })
    );
  });
}

function renderDangerAlerts(reports) {
  const root = document.getElementById("danger-alert-list");
  if (!root) return;
  clearElement(root);

  const targets = reports
    .filter((h) => (h.alerts || []).length)
    .sort((a, b) => b.alerts.length - a.alerts.length)
    .slice(0, 6);

  if (!targets.length) {
    root.appendChild(
      createElement("p", {
        className: "paper-section__lead",
        text: "重大な危険アラートは検出されませんでした。",
      })
    );
    return;
  }

  targets.forEach((horse) => {
    const badges = createElement("div", { className: "alert-badges" });
    horse.alerts.forEach((alert) => {
      badges.appendChild(
        createElement("span", {
          className: `alert-badge alert-badge--${alert.tone}`,
          text: alert.label,
        })
      );
    });
    root.appendChild(
      createElement("article", {
        className: "danger-alert-card",
        children: [
          createElement("h3", {
            className: "danger-alert-card__horse",
            text: `${horse.paperMark} ${horse.number}番 ${horse.horse}`,
          }),
          badges,
          createElement("p", {
            className: "danger-alert-card__reason",
            text: horse.alerts.map((a) => a.reason).join(" "),
          }),
        ],
      })
    );
  });
}

function renderEvList(reports) {
  const root = document.getElementById("ev-list");
  if (!root) return;
  clearElement(root);
  const sorted = [...reports].sort((a, b) => b.evScore - a.evScore);
  const maxEv = Math.max(...sorted.map((h) => h.evScore), 1);

  sorted.slice(0, 10).forEach((horse) => {
    const fill = createElement("span", { className: "ev-row__fill" });
    root.appendChild(
      createElement("article", {
        className: `ev-row ev-row--${horse.evTone}`,
        children: [
          createElement("div", {
            className: "ev-row__top",
            children: [
              createElement("p", {
                className: "ev-row__name",
                text: `${horse.paperMark} ${horse.number}番 ${horse.horse}`,
              }),
              createElement("span", {
                className: "ev-row__value",
                text: `${horse.evScore}%`,
              }),
            ],
          }),
          createElement("p", {
            className: "ev-row__label",
            text: `${evLabel(horse.evTone)} ／ 勝率${horse.winPct}% × オッズ${horse.odds}`,
          }),
          createElement("div", {
            className: "ev-row__track",
            children: [fill],
          }),
        ],
      })
    );
    requestAnimationFrame(() => {
      fill.style.width = `${clamp((horse.evScore / maxEv) * 100, 8, 100)}%`;
    });
  });
}

function renderHorseDeepList(reports) {
  const root = document.getElementById("horse-deep-list");
  if (!root) return;
  clearElement(root);

  reports.forEach((horse, index) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 200 200");
    svg.setAttribute("class", "mini-radar-svg");
    svg.setAttribute("aria-label", `${horse.horse}能力レーダー`);
    drawSvgRadar(svg, horse.radar5, false);

    const aptitude = createElement("div", { className: "aptitude-block" });
    aptitude.appendChild(buildAptitudeGroup("コース適性", horse.aptitude.course));
    aptitude.appendChild(buildAptitudeGroup("馬場適性", horse.aptitude.track));

    const badges = createElement("div", { className: "alert-badges" });
    (horse.alerts || []).forEach((alert) => {
      badges.appendChild(
        createElement("span", {
          className: `alert-badge alert-badge--${alert.tone}`,
          text: alert.label,
        })
      );
    });

    const card = createElement("article", {
      className: "horse-deep glass-card",
      children: [
        createElement("div", {
          className: "horse-deep__head",
          children: [
            createElement("div", {
              children: [
                createElement("h3", {
                  className: "horse-deep__title",
                  text: `${horse.paperMark} ${horse.number}番 ${horse.horse}`,
                }),
                createElement("p", {
                  className: "horse-deep__sub",
                  text: `AI指数 ${horse.aiIndex} ／ EV ${horse.evScore}% ／ ${horse.runningStyle}`,
                }),
              ],
            }),
          ],
        }),
        createElement("div", {
          className: "horse-deep__body",
          children: [svg, aptitude],
        }),
        badges,
      ],
    });
    root.appendChild(card);

    window.setTimeout(() => {
      svg.classList.add("is-drawn");
      animateAptitudeStars(card);
    }, 180 + index * 90);
  });
}

function buildAptitudeGroup(title, rows) {
  const wrap = createElement("div", { className: "aptitude-group" });
  wrap.appendChild(
    createElement("p", { className: "aptitude-group__title", text: title })
  );
  rows.forEach((row) => {
    const stars = createElement("div", {
      className: "aptitude-stars",
      attrs: { "data-stars": String(row.stars) },
    });
    for (let i = 1; i <= 5; i += 1) {
      const span = createElement("span", { text: "★" });
      if (i <= row.stars) span.classList.add("is-on");
      stars.appendChild(span);
    }
    wrap.appendChild(
      createElement("div", {
        className: "aptitude-row",
        children: [
          createElement("span", {
            className: "aptitude-row__name",
            text: row.name,
          }),
          stars,
        ],
      })
    );
  });
  return wrap;
}

function animateAptitudeStars(root) {
  root.querySelectorAll(".aptitude-stars").forEach((el, idx) => {
    window.setTimeout(() => el.classList.add("is-animated"), idx * 60);
  });
}

function drawSvgRadar(svg, values, animateImmediate) {
  clearElement(svg);
  const cx = 100;
  const cy = 100;
  const radius = 62;
  const n = RADAR5_LABELS.length;
  const step = (Math.PI * 2) / n;
  const start = -Math.PI / 2;

  for (let level = 4; level >= 1; level -= 1) {
    const pts = [];
    for (let i = 0; i < n; i += 1) {
      const a = start + step * i;
      const r = (radius / 4) * level;
      pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
    }
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", pts.join(" "));
    poly.setAttribute("class", "radar-grid");
    svg.appendChild(poly);
  }

  for (let i = 0; i < n; i += 1) {
    const a = start + step * i;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(cx));
    line.setAttribute("y1", String(cy));
    line.setAttribute("x2", String(cx + Math.cos(a) * radius));
    line.setAttribute("y2", String(cy + Math.sin(a) * radius));
    line.setAttribute("class", "radar-axis");
    svg.appendChild(line);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(cx + Math.cos(a) * (radius + 16)));
    text.setAttribute("y", String(cy + Math.sin(a) * (radius + 16) + 3));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "radar-label");
    text.textContent = RADAR5_LABELS[i];
    svg.appendChild(text);
  }

  const valuePts = values.map((v, i) => {
    const a = start + step * i;
    const r = radius * (clamp(v, 0, 100) / 100);
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  });
  const valuePoly = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polygon"
  );
  valuePoly.setAttribute("points", valuePts.join(" "));
  valuePoly.setAttribute("class", "radar-poly");
  svg.appendChild(valuePoly);

  if (animateImmediate) {
    requestAnimationFrame(() => svg.classList.add("is-drawn"));
  }
}

/* ---------- Existing Ver3.1 renderers (kept) ---------- */

function markClassName(mark) {
  return MARK_CLASS[mark] || "x";
}

function gradeToGauge(grade) {
  const map = { S: 96, A: 84, B: 70, C: 55, D: 38, E: 22 };
  const key = String(grade || "").toUpperCase();
  return map[key] != null ? map[key] : 50;
}

function animateConfidenceRing(value) {
  const ring = document.getElementById("confidence-ring");
  const arc = document.getElementById("confidence-ring-value");
  if (!arc) return;
  const pct = clamp(value, 0, 100);
  arc.style.strokeDasharray = String(CONF_RING_CIRC);
  arc.style.strokeDashoffset = String(CONF_RING_CIRC);
  requestAnimationFrame(() => {
    arc.style.strokeDashoffset = String(CONF_RING_CIRC * (1 - pct / 100));
    ring?.classList.add("is-animated");
  });
}

function animateOverallGauge(score, confidence) {
  const fill = document.getElementById("overall-gauge-fill");
  if (!fill) return;
  const pct = clamp(Math.max(score, confidence * 0.9), 0, 100);
  fill.style.strokeDasharray = String(GAUGE_LEN);
  fill.style.strokeDashoffset = String(GAUGE_LEN);
  requestAnimationFrame(() => {
    fill.style.strokeDashoffset = String(GAUGE_LEN * (1 - pct / 100));
  });
}

function renderPaceForecast(result) {
  const pace = result.paceForecast || {};
  const badges = document.getElementById("pace-badges");
  if (badges) {
    clearElement(badges);
    [
      { text: `ペース ${pace.pace || "平均"}`, cls: "pace-badge--pace" },
      { text: pace.advantage || "先行有利", cls: "pace-badge--adv" },
      {
        text: `逃${pace.nige || 0} 先${pace.senkou || 0} 差${pace.sashi || 0} 追${pace.oikomi || 0}`,
        cls: "pace-badge--count",
      },
    ].forEach((item) => {
      badges.appendChild(
        createElement("span", {
          className: `pace-badge ${item.cls}`,
          text: item.text,
        })
      );
    });
  }
  const summary = document.getElementById("pace-summary");
  if (summary) {
    summary.textContent =
      result.paceScenario ||
      `${pace.pace || "平均"}ペース想定。${pace.advantage || "先行有利"}の展開をベースに位置取りを整理しています。`;
  }
}

function renderWinRank(reports) {
  const root = document.getElementById("win-rank");
  if (!root) return;
  clearElement(root);
  const sorted = [...reports].sort((a, b) => (b.winPct || 0) - (a.winPct || 0));
  const max = Math.max(...sorted.map((h) => h.winPct || 0), 1);
  sorted.slice(0, 10).forEach((horse, index) => {
    const fill = createElement("span", { className: "win-rank__fill" });
    root.appendChild(
      createElement("div", {
        className: "win-rank__row",
        children: [
          createElement("span", {
            className: "win-rank__pos",
            text: `${index + 1}`,
          }),
          createElement("span", {
            className: `win-rank__mark mark--${horse.markClass}`,
            text: horse.paperMark,
          }),
          createElement("div", {
            className: "win-rank__body",
            children: [
              createElement("p", {
                className: "win-rank__name",
                text: `${horse.number}番 ${horse.horse}`,
              }),
              createElement("div", {
                className: "win-rank__track",
                children: [fill],
              }),
            ],
          }),
          createElement("span", {
            className: "win-rank__pct",
            text: `${Number(horse.winPct || 0).toFixed(1)}%`,
          }),
        ],
      })
    );
    requestAnimationFrame(() => {
      fill.style.width = `${clamp(((horse.winPct || 0) / max) * 100, 4, 100)}%`;
    });
  });
}

function renderPaceLanes(lanes) {
  const root = document.getElementById("pace-lanes");
  if (!root) return;
  clearElement(root);
  lanes.forEach((lane) => {
    const label = createElement("h3", {
      className: "pace-lane__label",
      text: lane.label,
    });
    const list = createElement("ul", { className: "pace-lane__list" });
    (lane.horses || []).forEach((horse) => {
      list.appendChild(createElement("li", { text: horse }));
    });
    root.appendChild(
      createElement("div", { className: "pace-lane", children: [label, list] })
    );
  });
}

function renderMarks(reports) {
  const root = document.getElementById("paper-marks");
  if (!root) return;
  clearElement(root);
  reports.slice(0, 12).forEach((horse) => {
    root.appendChild(
      createElement("article", {
        className: `paper-mark-row paper-mark-row--${horse.markClass}`,
        children: [
          createElement("div", {
            className: "paper-mark-row__mark",
            text: horse.paperMark,
          }),
          createElement("div", {
            className: "paper-mark-row__num",
            text: `${horse.number}番`,
          }),
          createElement("div", {
            className: "paper-mark-row__body",
            children: [
              createElement("strong", { text: horse.horse }),
              createElement("p", { text: horse.markReason }),
            ],
          }),
        ],
      })
    );
  });
}

function renderSpotlight(result, reports) {
  const danger = result.dangerHorse || {};
  const upset = result.upsetHorse || {};
  const safe = reports[0] || {};
  setText("danger-horse", danger.horse || "-");
  setGrade("danger-grade", danger.grade || "C");
  setText("danger-reason", danger.reason || "");
  setText("upset-horse", upset.horse || "-");
  setGrade("upset-grade", upset.grade || "A");
  setText("upset-reason", upset.reason || "");
  setText("safe-horse", safe.horse || "-");
  setGrade("safe-grade", safe.grade || "S");
  setText(
    "safe-reason",
    safe.roleComment ||
      `${safe.number || ""}番は思考評価・指数上位の鉄板候補です。`
  );
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setGrade(id, grade) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `ai-grade ai-grade--${String(grade).toLowerCase()}`;
  el.textContent = grade;
}

function setBar(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  requestAnimationFrame(() => {
    el.style.width = `${clamp(value, 0, 100)}%`;
  });
}

function renderIndexTable(reports) {
  const body = document.getElementById("index-rank-body");
  if (!body) return;
  clearElement(body);
  reports.forEach((horse, index) => {
    const tr = createTableRow([
      `${index + 1}`,
      horse.paperMark,
      String(horse.number),
      horse.horse,
      String(horse.aiIndex),
      `${horse.expectedValuePercent}%`,
      horse.risk,
      horse.runningStyle,
      `${horse.popularity}番人気`,
    ]);
    const markCell = tr.children[1];
    if (markCell) markCell.className = `td-mark mark--${horse.markClass}`;
    tr.addEventListener("click", () => {
      body.querySelectorAll("tr").forEach((row) => row.classList.remove("is-active"));
      tr.classList.add("is-active");
      showDetail(horse);
    });
    body.appendChild(tr);
  });
}

function renderIndexCards(reports) {
  const root = document.getElementById("index-cards");
  if (!root) return;
  clearElement(root);
  reports.forEach((horse, index) => {
    const card = createElement("article", {
      className: "index-card",
      children: [
        createElement("div", {
          className: "index-card__left",
          children: [
            createElement("span", {
              className: "index-card__rank",
              text: `${index + 1}位`,
            }),
            createElement("span", {
              className: `index-card__mark mark--${horse.markClass}`,
              text: horse.paperMark,
            }),
          ],
        }),
        createElement("div", {
          className: "index-card__main",
          children: [
            createElement("p", {
              className: "index-card__name",
              text: `${horse.number}番 ${horse.horse}`,
            }),
            createElement("p", {
              className: "index-card__meta",
              text: `${horse.runningStyle} ／ ${horse.popularity}人気 ／ EV ${horse.evScore}%`,
            }),
          ],
        }),
        createElement("div", {
          className: "index-card__score",
          children: [
            createElement("span", {
              className: "index-card__ai",
              text: String(horse.aiIndex),
            }),
            createElement("span", {
              className: "index-card__ev",
              text: evLabel(horse.evTone),
            }),
          ],
        }),
      ],
    });
    card.addEventListener("click", () => {
      root.querySelectorAll(".index-card").forEach((el) => el.classList.remove("is-active"));
      card.classList.add("is-active");
      showDetail(horse);
    });
    root.appendChild(card);
  });
}

function showDetail(horse) {
  const panel = document.getElementById("horse-detail");
  if (!panel) return;
  panel.hidden = false;
  panel.classList.remove("is-hidden");
  setText("detail-title", `${horse.paperMark} ${horse.number}番 ${horse.horse}`);

  const radar = document.getElementById("detail-radar");
  if (radar) {
    radar.classList.remove("is-drawn");
    drawSvgRadar(radar, horse.radar5 || [60, 60, 60, 60, 60], true);
  }

  const bars = document.getElementById("detail-bars");
  clearElement(bars);
  const breakdown = horse.breakdown || {};
  ABILITY_KEYS.forEach(([key, label, color]) => {
    const value = Number(
      breakdown[key] != null
        ? breakdown[key]
        : horse.thinking?.factors?.[key] != null
          ? horse.thinking.factors[key]
          : 60
    );
    bars.appendChild(buildAbilityRow(label, value, color));
  });
  requestAnimationFrame(() => animateAbilityBars(bars));

  const aptitudeRoot = document.getElementById("detail-aptitude");
  if (aptitudeRoot) {
    clearElement(aptitudeRoot);
    if (horse.aptitude) {
      aptitudeRoot.appendChild(
        buildAptitudeGroup("コース適性", horse.aptitude.course)
      );
      aptitudeRoot.appendChild(
        buildAptitudeGroup("馬場適性", horse.aptitude.track)
      );
      requestAnimationFrame(() => animateAptitudeStars(aptitudeRoot));
    }
  }

  const alertRoot = document.getElementById("detail-alerts");
  if (alertRoot) {
    clearElement(alertRoot);
    (horse.alerts || []).forEach((alert) => {
      alertRoot.appendChild(
        createElement("span", {
          className: `alert-badge alert-badge--${alert.tone}`,
          text: alert.label,
        })
      );
    });
  }

  appendLines(
    document.getElementById("detail-text"),
    [
      ...(horse.comments || []),
      "",
      horse.markReason || "",
      `推定勝率 ${horse.winPct}% / 連対 ${horse.placePct}% / 複勝 ${horse.showPct}%`,
      `EV ${horse.evScore}%（${evLabel(horse.evTone)}）`,
      ...(horse.alerts || []).map((a) => `${a.label}: ${a.reason}`),
    ].filter(Boolean)
  );
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideDetail() {
  const panel = document.getElementById("horse-detail");
  if (!panel) return;
  panel.hidden = true;
  panel.classList.add("is-hidden");
}

function buildAbilityRow(label, value, color) {
  const fill = createElement("span", {
    className: `ability-track__fill ability-track__fill--${color}`,
  });
  fill.dataset.value = String(clamp(value, 0, 100));
  return createElement("div", {
    className: "ability-row",
    children: [
      createElement("span", { className: "ability-row__label", text: label }),
      createElement("div", { className: "ability-track", children: [fill] }),
      createElement("span", {
        className: "ability-row__value",
        text: String(Math.round(value)),
      }),
    ],
  });
}

function animateAbilityBars(root) {
  root.querySelectorAll(".ability-track__fill").forEach((el) => {
    el.style.width = `${el.dataset.value || 0}%`;
  });
}

function renderStyleDistribution(lanes, pace) {
  const root = document.getElementById("style-distribution");
  if (!root) return;
  clearElement(root);
  const counts = pace?.counts || {};
  ["逃げ", "先行", "差し", "追込"].forEach((label) => {
    const lane = lanes.find((l) => l.label === label);
    const horses = (lane?.horses || []).filter((h) => h && h !== "-");
    const count = counts[label] != null ? counts[label] : horses.length;
    root.appendChild(
      createElement("div", {
        className: "paper-style-item",
        children: [
          createElement("p", {
            className: "paper-style-item__label",
            text: `${label}（${count}）`,
          }),
          createElement("p", {
            className: "paper-style-item__horses",
            text: horses.length ? horses.join(" / ") : "—",
          }),
        ],
      })
    );
  });
}

function renderTimeline(result, reports) {
  const root = document.getElementById("race-timeline");
  if (!root) return;
  clearElement(root);
  const pace = result.paceForecast?.pace || "平均";
  const top = reports[0];
  const closer = reports.find(
    (h) => h.runningStyle === "差し" || h.runningStyle === "追込"
  );
  const nige = reports.find((h) => h.runningStyle === "逃げ");
  const steps = [
    {
      label: "スタート",
      text: nige
        ? `${nige.number}番がハナを主張。${pace}の流れへ。`
        : "スタート直後は様子見。位置取り争い。",
    },
    {
      label: "向正面",
      text: String(pace).includes("ハイ")
        ? "テンが速く先行勢に負荷。差し待機が浮上。"
        : "ゆったりとしたラップ。逃げ先行が楽な形。",
    },
    {
      label: "3角",
      text: top
        ? `${top.number}番が好位〜中団で脚を溜める。`
        : "各馬が最終位置取りへ移行。",
    },
    {
      label: "4角",
      text: String(pace).includes("スロー")
        ? "逃げ先行が残る展開。捲りは厳しい。"
        : "後方勢が一気に進出開始。",
    },
    {
      label: "直線",
      text: closer
        ? `${closer.number}番が外から伸びてくる局面。`
        : "末脚勝負。各馬一斉にスパート。",
    },
    {
      label: "ゴール",
      text: top
        ? `AI本命 ${top.number}番の押し切り/差し切りを想定。`
        : "混戦決着の可能性も残る。",
    },
  ];
  steps.forEach((step) => {
    root.appendChild(
      createElement("div", {
        className: "paper-timeline__step",
        children: [
          createElement("p", {
            className: "paper-timeline__label",
            text: step.label,
          }),
          createElement("p", {
            className: "paper-timeline__text",
            text: step.text,
          }),
        ],
      })
    );
  });
}

function renderAbilityBars(reports) {
  const root = document.getElementById("ability-bars");
  if (!root) return;
  clearElement(root);
  reports.forEach((horse) => {
    const rows = createElement("div", { className: "paper-detail__bars" });
    ABILITY_KEYS.forEach(([key, label, color]) => {
      const raw =
        horse.breakdown?.[key] != null
          ? horse.breakdown[key]
          : horse.thinking?.factors?.[key] != null
            ? horse.thinking.factors[key]
            : 60;
      rows.appendChild(buildAbilityRow(label, Number(raw), color));
    });
    root.appendChild(
      createElement("div", {
        className: "paper-ability__horse",
        children: [
          createElement("p", {
            className: "paper-ability__name",
            text: `${horse.paperMark}${horse.number} ${horse.horse}`,
          }),
          rows,
        ],
      })
    );
  });
  requestAnimationFrame(() => animateAbilityBars(root));
}

function resolveStrategyKey(strategy, tickets) {
  if (strategy !== "AIおすすめ") return strategy;
  return (
    tickets?.defaultStrategy ||
    (tickets?.bias === "穴狙い" ? "高配当型" : "バランス型")
  );
}

function renderTicketTabs(tickets) {
  const typeTabs = document.getElementById("ticket-type-tabs");
  const strategyTabs = document.getElementById("ticket-strategy-tabs");
  if (!typeTabs || !strategyTabs) return;
  clearElement(typeTabs);
  clearElement(strategyTabs);

  STRATEGY_UI.forEach((strategy) => {
    strategyTabs.appendChild(
      createElement("button", {
        type: "button",
        className: `paper-tab${strategy.key === selectedStrategy ? " is-active" : ""}`,
        text: strategy.label,
        onClick: () => {
          selectedStrategy = strategy.key;
          renderTicketTabs(tickets || cachedTickets);
          renderTicketBets(tickets || cachedTickets);
        },
      })
    );
  });

  TICKET_TYPES.forEach((type) => {
    typeTabs.appendChild(
      createElement("button", {
        type: "button",
        className: `paper-tab${type === selectedTicketType ? " is-active" : ""}`,
        text: type,
        onClick: () => {
          selectedTicketType = type;
          renderTicketTabs(tickets || cachedTickets);
          renderTicketBets(tickets || cachedTickets);
        },
      })
    );
  });
}

function resolveTicketData(tickets, type, strategy) {
  const node = tickets?.types?.[type];
  if (!node) return null;
  const resolved = resolveStrategyKey(strategy, tickets);
  if (strategy === "AIおすすめ") {
    const base =
      node[resolved] || node["バランス型"] || node["本命型"] || node;
    return {
      ...base,
      comment: [
        `AIおすすめ（${resolved}）を自動選択しています。`,
        "",
        ...(base.comment || []),
      ],
    };
  }
  return node[resolved] || node["バランス型"] || node;
}

function renderTicketBets(tickets) {
  const list = document.getElementById("paper-ticket-bets");
  if (!list) return;
  clearElement(list);
  const data = resolveTicketData(
    tickets || cachedTickets,
    selectedTicketType,
    selectedStrategy
  );
  if (!data?.bets?.length) {
    list.appendChild(
      createElement("p", {
        className: "paper-ticket-note",
        text: "買い目データがありません",
      })
    );
    return;
  }

  data.bets.slice(0, 8).forEach((bet) => {
    const mark = createElement("span", {
      className: `ticket-bet-card__mark mark--${markClassName(bet.mark)}`,
      text: bet.mark,
    });
    const combo = createElement("span", {
      className: "ticket-bet-card__combo",
      text: bet.combo,
    });
    list.appendChild(
      createElement("article", {
        className: "ticket-bet-card",
        children: [
          createElement("div", {
            className: "ticket-bet-card__main",
            children: [mark, combo],
          }),
          createElement("div", {
            className: "ticket-bet-card__meta",
            children: [
              createElement("span", {
                className: "ticket-bet-card__confidence",
                text: `AI信頼度 ${bet.confidence}%`,
              }),
            ],
          }),
        ],
      })
    );
  });

  const note = document.getElementById("paper-ticket-note");
  if (note) note.textContent = (data.comment || []).filter(Boolean).join(" ");
}

/* ---------- Charts / canvas ---------- */

function drawCourseMap(canvas, result) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = 900;
  const height = 420;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = GOLD_DIM;
  ctx.lineWidth = 18;
  roundRectPath(ctx, 70, 60, 760, 300, 120);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = GOLD;
  roundRectPath(ctx, 110, 100, 680, 220, 90);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.font = "700 14px 'Noto Sans JP', sans-serif";
  ctx.fillText("START", 120, 50);
  ctx.fillText("GOAL", 760, 50);
  const lanes = result.paceLanes || [];
  const positions = {
    逃げ: { x: 180, y: 140 },
    先行: { x: 300, y: 170 },
    差し: { x: 480, y: 250 },
    追込: { x: 620, y: 300 },
  };
  Object.entries(positions).forEach(([label, pos]) => {
    const lane = lanes.find((l) => l.label === label);
    const horses = (lane?.horses || []).filter((h) => h && h !== "-");
    const text = horses.length
      ? `${label} ${horses
          .map((name) => {
            const hit = (result.horses || []).find((h) => h.horse === name);
            return hit ? hit.number : name;
          })
          .join(",")}`
      : label;
    drawHorseChip(ctx, pos.x, pos.y, text);
  });
  ctx.strokeStyle = GOLD;
  ctx.fillStyle = GOLD;
  ctx.lineWidth = 2;
  drawArrow(ctx, 200, 155, 280, 175);
  drawArrow(ctx, 340, 190, 460, 240);
  drawArrow(ctx, 520, 265, 600, 295);
}

function drawHorseChip(ctx, x, y, text) {
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  const w = Math.min(210, 28 + text.length * 11);
  roundRectPath(ctx, x, y, w, 32, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.font = "700 13px 'Noto Sans JP', sans-serif";
  ctx.fillText(text, x + 10, y + 21);
}

function drawArrow(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 10 * Math.cos(angle - 0.4), y2 - 10 * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - 10 * Math.cos(angle + 0.4), y2 - 10 * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
}

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawRadarChart(canvas, radar) {
  if (!canvas || !radar) return;
  const labels = radar.labels || [];
  const values = radar.values || [];
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const size = 320;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.32;
  const step = (Math.PI * 2) / Math.max(labels.length, 1);
  const start = -Math.PI / 2;
  for (let level = 4; level >= 1; level -= 1) {
    const r = (radius / 4) * level;
    ctx.beginPath();
    labels.forEach((_, i) => {
      const a = start + step * i;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = GOLD_DIM;
    ctx.fillStyle = level % 2 ? "rgba(0,0,0,0.15)" : "rgba(201,162,39,0.04)";
    ctx.fill();
    ctx.stroke();
  }
  const from = performance.now();
  const draw = (now) => {
    const t = Math.min(1, (now - from) / 700);
    const ease = 1 - Math.pow(1 - t, 3);
    ctx.beginPath();
    values.forEach((value, i) => {
      const a = start + step * i;
      const rr = radius * ((value * ease) / 100);
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = GOLD_FILL;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    if (t < 1) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  ctx.fillStyle = GOLD;
  ctx.font = "700 12px 'Noto Sans JP', sans-serif";
  ctx.textAlign = "center";
  labels.forEach((label, i) => {
    const a = start + step * i;
    ctx.fillText(
      label,
      cx + Math.cos(a) * (radius + 24),
      cy + Math.sin(a) * (radius + 24)
    );
  });
}

function drawBarChart(canvas, reports) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = 420;
  const height = 300;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const max = Math.max(...reports.map((h) => h.aiIndex || 1), 1);
  const gap = 10;
  const barW =
    (width - 40 - gap * (reports.length - 1)) / Math.max(reports.length, 1);
  const baseY = height - 36;
  reports.forEach((horse, i) => {
    const target = ((horse.aiIndex || 0) / max) * (height - 70);
    const x = 20 + i * (barW + gap);
    const from = performance.now();
    const animate = (now) => {
      const t = Math.min(1, (now - from) / 800);
      const h = target * (1 - Math.pow(1 - t, 3));
      ctx.clearRect(x - 1, 20, barW + 2, baseY - 18);
      const grad = ctx.createLinearGradient(0, baseY - h, 0, baseY);
      grad.addColorStop(0, GOLD);
      grad.addColorStop(1, "#8a7020");
      ctx.fillStyle = grad;
      ctx.fillRect(x, baseY - h, barW, h);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    ctx.fillStyle = GOLD;
    ctx.font = "700 11px 'Noto Sans JP', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(horse.number), x + barW / 2, height - 14);
  });
}

function drawLineChart(canvas, reports) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = 420;
  const height = 300;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const values = reports.map((h) => h.expectedValuePercent || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const points = values.map((v, i) => {
    const x = 30 + (i * (width - 60)) / Math.max(values.length - 1, 1);
    const y = 30 + ((max - v) / span) * (height - 70);
    return { x, y, n: reports[i].number };
  });
  const from = performance.now();
  const animate = (now) => {
    const t = Math.min(1, (now - from) / 900);
    const count = Math.max(2, Math.floor(points.length * t));
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = GOLD_DIM;
    ctx.beginPath();
    ctx.moveTo(20, height - 30);
    ctx.lineTo(width - 20, height - 30);
    ctx.stroke();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.slice(0, count).forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    points.slice(0, count).forEach((p) => {
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "700 11px 'Noto Sans JP', sans-serif";
      ctx.fillText(String(p.n), p.x - 4, p.y - 10);
    });
    if (t < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

function drawPieChart(canvas, pace) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const size = 300;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const data = [
    { label: "逃げ", value: pace?.nige || 0, color: "#e8d48b" },
    { label: "先行", value: pace?.senkou || 0, color: "#90caf9" },
    { label: "差し", value: pace?.sashi || 0, color: "#81c784" },
    { label: "追込", value: pace?.oikomi || 0, color: "#ef9a9a" },
  ];
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2 - 10;
  const radius = 90;
  const start = -Math.PI / 2;
  const from = performance.now();
  const animate = (now) => {
    const t = Math.min(1, (now - from) / 900);
    ctx.clearRect(0, 0, size, size);
    let angle = start;
    data.forEach((d) => {
      const slice = (d.value / total) * Math.PI * 2 * t;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = d.color;
      ctx.fill();
      angle += slice;
    });
    if (t < 1) requestAnimationFrame(animate);
    else {
      data.forEach((d, i) => {
        ctx.fillStyle = d.color;
        ctx.fillRect(30, size - 70 + i * 16, 10, 10);
        ctx.fillStyle = GOLD;
        ctx.font = "700 12px 'Noto Sans JP', sans-serif";
        ctx.fillText(`${d.label} ${d.value}`, 48, size - 61 + i * 16);
      });
    }
  };
  requestAnimationFrame(animate);
}

/* ---------- Animation sequence ---------- */

function runAnalysisSequence() {
  if (sequenceStarted) return;
  sequenceStarted = true;
  const overlay = document.getElementById("ai-scan-overlay");
  const nodes = Array.from(document.querySelectorAll(".page--v32 .reveal"));

  nodes.forEach((n) => n.classList.remove("is-visible"));
  overlay?.classList.add("is-active");

  window.setTimeout(() => {
    overlay?.classList.remove("is-active");
    nodes.forEach((node, index) => {
      window.setTimeout(() => {
        node.classList.add("is-visible");
        node.querySelectorAll(".mini-radar-svg").forEach((svg) => {
          svg.classList.add("is-drawn");
        });
        animateAptitudeStars(node);
      }, index * 120);
    });
  }, 900);
}

function animateCount(el, target, suffix = "", duration = 800, asFloat = false) {
  if (!el) return;
  const from = performance.now();
  const goal = Number(target) || 0;
  const tick = (now) => {
    const t = Math.min(1, (now - from) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = goal * eased;
    el.textContent = asFloat
      ? `${value.toFixed(1)}${suffix}`
      : `${Math.round(value)}${suffix}`;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- Helpers ---------- */

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, Number(v) || 0));
}

function round1(v) {
  return Math.round(Number(v) * 10) / 10;
}

function toNum(value, fallback) {
  return value != null && value !== "" ? Number(value) : fallback;
}

function indexTo100(index) {
  if (index == null) return 0;
  return clamp(Number(index) / 10, 0, 99);
}

function starsToNum(stars, fallback) {
  if (typeof stars === "number") return stars;
  if (typeof stars === "string") {
    const count = (stars.match(/★/g) || []).length;
    if (count) return count;
  }
  return fallback;
}
