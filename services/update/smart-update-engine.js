/* ========================================
   SmartUpdateEngine — Ver7.2
   ======================================== */

import { computeNextUpdateAt, isScheduleDue, resolveSchedulePhase, phaseLabel } from "./update-scheduler.js";
import { subscribeEvents, fireMockEvent, getWatchTargets, listMockEventTypes, emitEvent } from "./event-watcher.js";
import {
  evaluateTrigger,
  setBaselineSnapshot,
  commitBaseline,
  buildRaceSnapshot,
} from "./analysis-trigger.js";
import { enqueueRefresh, flushRefresh, peekQueue } from "./refresh-manager.js";
import {
  appendUpdateLog,
  loadUpdateHistory,
  loadUpdateState,
  saveUpdateState,
  clearUpdateHistory,
  UPDATE_VERSION,
} from "./update-history-manager.js";
import { UPDATE_PRIORITY } from "./priorities.js";
import { nowIso, formatJa } from "./utils.js";
import { refreshRaceDataOnly } from "../race-connect/race-data-connector.js";
import { refreshEntriesOnly } from "../entry/horse-entry-manager.js";
import { refreshDrawOnly } from "../draw/draw-manager.js";
import { refreshOddsOnly } from "../odds/odds-manager.js";
import { refreshWeatherOnly } from "../weather/weather-manager.js";
import { refreshNewsOnly } from "../news/news-manager.js";
import { refreshSocialOnly } from "../social/social-manager.js";

const ENGINE_VERSION = "7.2.0";
let unsub = null;
let analysisHandler = null;
let contextProvider = null;
let handlingEvent = false;

/**
 * 表示層から再分析ハンドラを登録
 * handler({ reason, event, trigger }) => Promise<{ confidence, completeness, stage }>
 */
export function registerAnalysisHandler(fn) {
  analysisHandler = typeof fn === "function" ? fn : null;
}

export function registerContextProvider(fn) {
  contextProvider = typeof fn === "function" ? fn : null;
}

export function setAutoUpdate(enabled) {
  const state = loadUpdateState();
  return saveUpdateState({ ...state, autoUpdate: Boolean(enabled) });
}

export function getAutoUpdate() {
  return Boolean(loadUpdateState().autoUpdate);
}

export function startSmartUpdateEngine(options = {}) {
  stopSmartUpdateEngine();
  if (options.contextProvider) registerContextProvider(options.contextProvider);
  if (options.analysisHandler) registerAnalysisHandler(options.analysisHandler);

  unsub = subscribeEvents((event) => {
    if (!event) return; // Ver9.0 dedupe may suppress emit
    void handleIncomingEvent(event);
  });

  // 初期ベースライン
  const ctx = safeContext();
  if (ctx.snapshot) setBaselineSnapshot(ctx.snapshot);

  const state = loadUpdateState();
  saveUpdateState({
    ...state,
    status: state.autoUpdate ? "watching" : "paused",
    statusLabel: state.autoUpdate ? "監視中" : "自動更新OFF",
  });

  return getUpdateStatus(ctx);
}

export function stopSmartUpdateEngine() {
  if (unsub) {
    unsub();
    unsub = null;
  }
}

async function handleIncomingEvent(event) {
  // 再入禁止（イベント → refresh → emit → イベント の無限ループを遮断）
  if (handlingEvent) {
    return { skipped: true, reason: "re-entrancy" };
  }
  handlingEvent = true;
  try {
    return await handleIncomingEventInner(event);
  } finally {
    handlingEvent = false;
  }
}

async function handleIncomingEventInner(event) {
  const state = loadUpdateState();
  if (!state.autoUpdate && event?.source !== "manual-force") {
    appendUpdateLog({
      eventType: event.type,
      priority: event.priority,
      change: event.detail,
      reason: "自動更新OFFのためスキップ",
      skipped: true,
      analyzed: false,
      analysisStage: safeContext().stage ?? null,
    });
    return { skipped: true };
  }

  const ctx = safeContext();
  let snapshot = ctx.snapshot || buildRaceSnapshot(ctx);

  // Ver7.5: 開催情報更新時は Race のみ再取得。変更無ければ AI 再分析しない
  if (
    event?.type === "meeting_update" ||
    event?.payload?.raceOnly ||
    event?.source === "race-connect"
  ) {
    try {
      const raceRefresh = await refreshRaceDataOnly({
        emitUpdate: false,
        silent: true,
      });
      if (!raceRefresh.ok || !raceRefresh.changed) {
        appendUpdateLog({
          eventType: event.type,
          priority: event.priority,
          change: event.detail,
          reason: raceRefresh.ok
            ? "Race情報に変更が無いため再分析をスキップしました。"
            : `Race Connect 再取得失敗: ${raceRefresh.message || ""}`,
          skipped: true,
          analyzed: false,
          analysisStage: snapshot.stage,
          confidence: ctx.confidence,
          dataCompleteness: ctx.completeness,
        });
        saveUpdateState({
          ...state,
          lastUpdateAt: nowIso(),
          lastReason: "Race Connect: 変更なしスキップ",
          lastEventType: event.type,
          lastPriority: event.priority,
          status: "skipped",
          statusLabel: "Race変更なし（スキップ）",
        });
        return { skipped: true, raceOnly: true };
      }
      const hit =
        (raceRefresh.races || []).find(
          (r) => Number(r.number) === Number(snapshot.raceId)
        ) || raceRefresh.races?.[0];
      if (hit) {
        snapshot = {
          ...snapshot,
          trackCondition: hit.trackCondition || snapshot.trackCondition,
          weather: hit.weather || snapshot.weather,
          raceMeta: fingerprintLite(hit),
        };
      }
    } catch {
      /* Race Connect 失敗時は従来トリガへフォールバック */
    }
  }

  // Ver7.6: Entry 変更時は登録馬のみ再取得。変更無ければ再分析しない
  if (
    event?.payload?.entryOnly ||
    event?.source === "entry-engine" ||
    ["entry_added", "entry_scratched", "entry_status_changed"].includes(
      event?.type
    )
  ) {
    try {
      const entryRefresh = await refreshEntriesOnly({
        emitUpdate: false,
        silent: true,
        stage: snapshot.stage,
      });
      if (!entryRefresh.ok || !entryRefresh.changed) {
        appendUpdateLog({
          eventType: event.type,
          priority: event.priority,
          change: event.detail,
          reason: entryRefresh.ok
            ? "Entry情報に変更が無いため再分析をスキップしました。"
            : `Entry 再取得失敗: ${entryRefresh.message || ""}`,
          skipped: true,
          analyzed: false,
          analysisStage: snapshot.stage,
          confidence: ctx.confidence,
          dataCompleteness: ctx.completeness,
        });
        saveUpdateState({
          ...state,
          lastUpdateAt: nowIso(),
          lastReason: "Entry: 変更なしスキップ",
          lastEventType: event.type,
          lastPriority: event.priority,
          status: "skipped",
          statusLabel: "Entry変更なし（スキップ）",
        });
        return { skipped: true, entryOnly: true };
      }
      snapshot = {
        ...snapshot,
        entryFingerprint: entryRefresh.fingerprint,
        entryCount: entryRefresh.count,
      };
    } catch {
      /* Entry 失敗時は従来トリガへ */
    }
  }

  // Ver7.7: Draw 変更時は枠・騎手・斤量のみ再取得。変更無ければ再分析しない
  if (
    event?.payload?.drawOnly ||
    event?.source === "draw-engine" ||
    [
      "frame_confirmed",
      "frame_changed",
      "jockey_change",
      "weight_change",
      "scratched",
      "excluded",
    ].includes(event?.type)
  ) {
    try {
      const drawRefresh = await refreshDrawOnly({
        emitUpdate: false,
        silent: true,
        stage: snapshot.stage,
      });
      if (!drawRefresh.ok || !drawRefresh.changed) {
        appendUpdateLog({
          eventType: event.type,
          priority: event.priority,
          change: event.detail,
          reason: drawRefresh.ok
            ? "Draw情報に変更が無いため再分析をスキップしました。"
            : `Draw 再取得失敗: ${drawRefresh.message || ""}`,
          skipped: true,
          analyzed: false,
          analysisStage: snapshot.stage,
          confidence: ctx.confidence,
          dataCompleteness: ctx.completeness,
        });
        saveUpdateState({
          ...state,
          lastUpdateAt: nowIso(),
          lastReason: "Draw: 変更なしスキップ",
          lastEventType: event.type,
          lastPriority: event.priority,
          status: "skipped",
          statusLabel: "Draw変更なし（スキップ）",
        });
        return { skipped: true, drawOnly: true };
      }
      snapshot = {
        ...snapshot,
        drawFingerprint: drawRefresh.fingerprint,
        drawCount: drawRefresh.count,
        stage: Math.max(
          Number(snapshot.stage) || 0,
          Number(drawRefresh.confirmedStage) || 0
        ),
      };
    } catch {
      /* Draw 失敗時は従来トリガへ */
    }
  }

  // Ver7.8: Odds 変更時のみ再取得。変更無ければ再分析しない
  if (
    event?.payload?.oddsOnly ||
    event?.source === "odds-engine" ||
    [
      "odds_updated",
      "odds_spike",
      "popularity_changed",
      "market_index_updated",
      "odds_added",
    ].includes(event?.type)
  ) {
    try {
      const oddsRefresh = await refreshOddsOnly({
        emitUpdate: false,
        silent: true,
        stage: snapshot.stage,
      });
      if (!oddsRefresh.ok || !oddsRefresh.changed) {
        appendUpdateLog({
          eventType: event.type,
          priority: event.priority,
          change: event.detail,
          reason: oddsRefresh.ok
            ? "Odds情報に変更が無いため再分析をスキップしました。"
            : `Odds 再取得失敗: ${oddsRefresh.message || ""}`,
          skipped: true,
          analyzed: false,
          analysisStage: snapshot.stage,
          confidence: ctx.confidence,
          dataCompleteness: ctx.completeness,
        });
        saveUpdateState({
          ...state,
          lastUpdateAt: nowIso(),
          lastReason: "Odds: 変更なしスキップ",
          lastEventType: event.type,
          lastPriority: event.priority,
          status: "skipped",
          statusLabel: "Odds変更なし（スキップ）",
        });
        return { skipped: true, oddsOnly: true };
      }
      snapshot = {
        ...snapshot,
        oddsFingerprint: oddsRefresh.fingerprint,
        oddsCount: oddsRefresh.count,
        stage: Math.max(
          Number(snapshot.stage) || 0,
          Number(oddsRefresh.confirmedStage) || 0
        ),
      };
    } catch {
      /* Odds 失敗時は従来トリガへ */
    }
  }

  // Ver7.9: Weather 変更時のみ再取得。変更無ければ再分析しない
  if (
    event?.payload?.weatherOnly ||
    event?.source === "weather-engine" ||
    [
      "weather_change",
      "track_change",
      "wind_speed_change",
      "wind_direction_change",
      "moisture_updated",
    ].includes(event?.type)
  ) {
    try {
      const weatherRefresh = await refreshWeatherOnly({
        emitUpdate: false,
        silent: true,
        stage: snapshot.stage,
      });
      if (!weatherRefresh.ok || !weatherRefresh.changed) {
        appendUpdateLog({
          eventType: event.type,
          priority: event.priority,
          change: event.detail,
          reason: weatherRefresh.ok
            ? "Weather情報に変更が無いため再分析をスキップしました。"
            : `Weather 再取得失敗: ${weatherRefresh.message || ""}`,
          skipped: true,
          analyzed: false,
          analysisStage: snapshot.stage,
          confidence: ctx.confidence,
          dataCompleteness: ctx.completeness,
        });
        saveUpdateState({
          ...state,
          lastUpdateAt: nowIso(),
          lastReason: "Weather: 変更なしスキップ",
          lastEventType: event.type,
          lastPriority: event.priority,
          status: "skipped",
          statusLabel: "Weather変更なし（スキップ）",
        });
        return { skipped: true, weatherOnly: true };
      }
      snapshot = {
        ...snapshot,
        weatherFingerprint: weatherRefresh.fingerprint,
        stage: Math.max(
          Number(snapshot.stage) || 0,
          Number(weatherRefresh.confirmedStage) || 0
        ),
      };
    } catch {
      /* Weather 失敗時は従来トリガへ */
    }
  }

  // Ver8.0: News 変更時のみ再取得。変更無ければ再分析しない
  if (
    event?.payload?.newsOnly ||
    event?.source === "news-engine" ||
    [
      "news_added",
      "news_updated",
      "news_scratch",
      "news_important",
    ].includes(event?.type)
  ) {
    try {
      const newsRefresh = await refreshNewsOnly({
        emitUpdate: false,
        silent: true,
        stage: snapshot.stage,
      });
      if (!newsRefresh.ok || !newsRefresh.changed) {
        appendUpdateLog({
          eventType: event.type,
          priority: event.priority,
          change: event.detail,
          reason: newsRefresh.ok
            ? "News情報に変更が無いため再分析をスキップしました。"
            : `News 再取得失敗: ${newsRefresh.message || ""}`,
          skipped: true,
          analyzed: false,
          analysisStage: snapshot.stage,
          confidence: ctx.confidence,
          dataCompleteness: ctx.completeness,
        });
        saveUpdateState({
          ...state,
          lastUpdateAt: nowIso(),
          lastReason: "News: 変更なしスキップ",
          lastEventType: event.type,
          lastPriority: event.priority,
          status: "skipped",
          statusLabel: "News変更なし（スキップ）",
        });
        return { skipped: true, newsOnly: true };
      }
      snapshot = {
        ...snapshot,
        newsFingerprint: newsRefresh.fingerprint,
        newsCount: newsRefresh.count,
      };
    } catch {
      /* News 失敗時は従来トリガへ */
    }
  }

  // Ver8.1: Social 変更時のみ再取得。変更無ければ再分析しない
  if (
    event?.payload?.socialOnly ||
    event?.source === "social-engine" ||
    [
      "social_topic_added",
      "social_spike",
      "social_important",
      "social_trend_change",
    ].includes(event?.type)
  ) {
    try {
      const socialRefresh = await refreshSocialOnly({
        emitUpdate: false,
        silent: true,
        stage: snapshot.stage,
      });
      if (!socialRefresh.ok || !socialRefresh.changed) {
        appendUpdateLog({
          eventType: event.type,
          priority: event.priority,
          change: event.detail,
          reason: socialRefresh.ok
            ? "Social情報に変更が無いため再分析をスキップしました。"
            : `Social 再取得失敗: ${socialRefresh.message || ""}`,
          skipped: true,
          analyzed: false,
          analysisStage: snapshot.stage,
          confidence: ctx.confidence,
          dataCompleteness: ctx.completeness,
        });
        saveUpdateState({
          ...state,
          lastUpdateAt: nowIso(),
          lastReason: "Social: 変更なしスキップ",
          lastEventType: event.type,
          lastPriority: event.priority,
          status: "skipped",
          statusLabel: "Social変更なし（スキップ）",
        });
        return { skipped: true, socialOnly: true };
      }
      snapshot = {
        ...snapshot,
        socialFingerprint: socialRefresh.fingerprint,
        socialCount: socialRefresh.count,
      };
    } catch {
      /* Social 失敗時は従来トリガへ */
    }
  }

  const trigger = evaluateTrigger(event, snapshot);

  if (trigger.deferToNextSchedule) {
    appendUpdateLog({
      eventType: event.type,
      priority: event.priority,
      change: event.detail,
      reason: trigger.reason,
      skipped: true,
      analyzed: false,
      analysisStage: snapshot.stage,
      confidence: ctx.confidence,
      dataCompleteness: ctx.completeness,
    });
    saveUpdateState({
      ...state,
      lastUpdateAt: nowIso(),
      lastReason: trigger.reason,
      lastEventType: event.type,
      lastPriority: event.priority,
      status: "deferred",
      statusLabel: "次回更新時反映待ち",
    });
    return { deferred: true, trigger };
  }

  if (!trigger.shouldAnalyze) {
    appendUpdateLog({
      eventType: event.type,
      priority: event.priority,
      change: event.detail,
      reason: trigger.reason,
      skipped: true,
      analyzed: false,
      analysisStage: snapshot.stage,
      confidence: ctx.confidence,
      dataCompleteness: ctx.completeness,
    });
    saveUpdateState({
      ...state,
      lastUpdateAt: nowIso(),
      lastReason: trigger.reason,
      lastEventType: event.type,
      lastPriority: event.priority,
      status: "skipped",
      statusLabel: "変更なし（スキップ）",
    });
    return { skipped: true, trigger };
  }

  enqueueRefresh({
    priority: trigger.priority,
    reason: trigger.reason,
    event,
    snapshot,
    trigger,
    delayMs: trigger.delayMs,
  });

  const flushed = await flushRefresh(async (job) => {
    let meta = {
      confidence: ctx.confidence,
      completeness: ctx.completeness,
      stage: snapshot.stage,
    };
    if (analysisHandler) {
      meta = (await analysisHandler(job)) || meta;
    }
    commitBaseline(job.trigger?.nextHash || trigger.nextHash, snapshot.stage);
    return meta;
  });

  const meta = flushed.result || {};
  const phase = resolveSchedulePhase({
    isMeetingDay: ctx.isMeetingDay,
    raceStartAt: ctx.raceStartAt,
    lastFinalAt: state.lastFinalAt,
  });

  const nextState = {
    ...loadUpdateState(),
    lastUpdateAt: nowIso(),
    lastAnalysisAt: nowIso(),
    lastScheduleAt:
      event.type === "schedule_tick" ? nowIso() : state.lastScheduleAt,
    lastFinalAt:
      phase === "final_15" ? nowIso() : state.lastFinalAt,
    lastReason: trigger.reason,
    lastEventType: event.type,
    lastPriority: trigger.priority,
    status: phase === "post_race" ? "review_wait" : "updated",
    statusLabel:
      phase === "post_race" ? "Race Review 待機" : "再分析完了",
    reviewWait: phase === "post_race",
  };
  saveUpdateState(nextState);

  appendUpdateLog({
    eventType: event.type,
    priority: trigger.priority,
    change: event.detail || event.type,
    reason: trigger.reason,
    analyzed: true,
    skipped: false,
    analysisStage: meta.stage ?? snapshot.stage,
    confidence: meta.confidence ?? ctx.confidence,
    dataCompleteness: meta.completeness ?? ctx.completeness,
  });

  return { analyzed: true, trigger, meta };
}

export function tickSchedule(force = false) {
  const state = loadUpdateState();
  const ctx = safeContext();
  const due =
    force ||
    isScheduleDue({
      isMeetingDay: ctx.isMeetingDay,
      raceStartAt: ctx.raceStartAt,
      lastScheduleAt: state.lastScheduleAt,
      lastFinalAt: state.lastFinalAt,
    });
  if (!due) {
    return { due: false, status: getUpdateStatus(ctx) };
  }
  const event = emitEvent({
    type: "schedule_tick",
    detail: phaseLabel(
      resolveSchedulePhase({
        isMeetingDay: ctx.isMeetingDay,
        raceStartAt: ctx.raceStartAt,
      })
    ),
    source: force ? "manual-force" : "scheduler",
    priority: UPDATE_PRIORITY.MEDIUM,
  });
  return { due: true, event };
}

export function notifyStageChange(fromStage, toStage) {
  if (fromStage === toStage) return null;
  return fireMockEvent(
    "stage_changed",
    `Stage${fromStage} → Stage${toStage}`
  );
}

export function getUpdateStatus(ctxInput) {
  const ctx = ctxInput || safeContext();
  const state = loadUpdateState();
  const schedule = computeNextUpdateAt({
    isMeetingDay: ctx.isMeetingDay,
    raceStartAt: ctx.raceStartAt,
    lastScheduleAt: state.lastScheduleAt,
    lastFinalAt: state.lastFinalAt,
  });

  return {
    version: ENGINE_VERSION,
    autoUpdate: state.autoUpdate,
    status: state.status,
    statusLabel: state.statusLabel,
    lastUpdateAt: state.lastUpdateAt,
    lastUpdateLabel: formatJa(state.lastUpdateAt),
    lastAnalysisAt: state.lastAnalysisAt,
    lastAnalysisLabel: formatJa(state.lastAnalysisAt),
    lastReason: state.lastReason || "—",
    lastEventType: state.lastEventType || "—",
    lastPriority: state.lastPriority || "—",
    schedule,
    nextUpdateLabel: formatJa(schedule.nextUpdateAt),
    watchTargets: getWatchTargets(),
    queueLength: peekQueue().length,
    reviewWait: Boolean(state.reviewWait),
    mockEvents: listMockEventTypes(),
  };
}

export function getUpdateDashboard() {
  const status = getUpdateStatus();
  const history = loadUpdateHistory();
  return {
    ...status,
    history,
    historyPreview: history.slice(0, 20),
    policy: {
      skipIfUnchanged: true,
      stageLinked: true,
      mockReady: true,
      realProviderReady: false,
      note: "変更が無い場合は再分析しません。Real Provider 切替可能な構造です。",
    },
  };
}

export function resetUpdateEngineData() {
  clearUpdateHistory();
  return saveUpdateState({
    ...loadUpdateState(),
    lastUpdateAt: null,
    lastAnalysisAt: null,
    lastScheduleAt: null,
    lastFinalAt: null,
    lastReason: "",
    status: "idle",
    statusLabel: "リセット済",
    reviewWait: false,
  });
}

function safeContext() {
  try {
    return contextProvider ? contextProvider() || {} : {};
  } catch {
    return {};
  }
}

function fingerprintLite(race = {}) {
  return [
    race.date,
    race.venueId,
    race.number,
    race.raceName,
    race.startTime,
    race.distanceMeters,
    race.surface,
    race.weather,
    race.trackCondition,
    race.grade,
  ].join("|");
}

export const SmartUpdateEngine = {
  start: startSmartUpdateEngine,
  stop: stopSmartUpdateEngine,
  tick: tickSchedule,
  status: getUpdateStatus,
  dashboard: getUpdateDashboard,
  setAutoUpdate,
  getAutoUpdate,
  notifyStageChange,
  fireMockEvent,
  registerAnalysisHandler,
  registerContextProvider,
  reset: resetUpdateEngineData,
  version: ENGINE_VERSION,
  UPDATE_VERSION,
};
