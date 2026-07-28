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

const ENGINE_VERSION = "7.2.0";
let unsub = null;
let analysisHandler = null;
let contextProvider = null;

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
      // Race メタをスナップショットへ反映（Horse/Odds は触らない）
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
