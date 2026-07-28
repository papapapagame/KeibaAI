/* ========================================
   DataScheduler — Ver7.0
   種別ごとの更新タイミング管理（将来の自動更新に対応）
   ======================================== */

import { nowIso } from "./utils.js";

const DEFAULT_INTERVALS = {
  race: 5 * 60 * 1000,
  odds: 30 * 1000,
  news: 10 * 60 * 1000,
  market: 60 * 1000,
};

const state = {
  lastRun: {
    race: null,
    odds: null,
    news: null,
    market: null,
  },
  intervals: { ...DEFAULT_INTERVALS },
  autoEnabled: false,
};

export function getSchedulerState() {
  return {
    ...state,
    lastRun: { ...state.lastRun },
    intervals: { ...state.intervals },
  };
}

export function setUpdateInterval(kind, ms) {
  if (!(kind in state.intervals)) return getSchedulerState();
  state.intervals[kind] = Math.max(1000, Number(ms) || DEFAULT_INTERVALS[kind]);
  return getSchedulerState();
}

export function markUpdated(kind) {
  if (!(kind in state.lastRun)) return getSchedulerState();
  state.lastRun[kind] = nowIso();
  return getSchedulerState();
}

export function shouldUpdate(kind) {
  const last = state.lastRun[kind];
  const interval = state.intervals[kind] ?? DEFAULT_INTERVALS.race;
  if (!last) return true;
  const t = Date.parse(last);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t >= interval;
}

export function setAutoUpdateEnabled(enabled) {
  state.autoEnabled = Boolean(enabled);
  return getSchedulerState();
}

/**
 * 手動／将来タイマーから呼ぶ更新プラン
 */
export function buildUpdatePlan(kinds = ["race", "odds", "news", "market"]) {
  return (kinds || []).map((kind) => ({
    kind,
    due: shouldUpdate(kind),
    lastRun: state.lastRun[kind],
    intervalMs: state.intervals[kind],
  }));
}

export const DataScheduler = {
  getState: getSchedulerState,
  setInterval: setUpdateInterval,
  markUpdated,
  shouldUpdate,
  setAutoUpdateEnabled,
  buildUpdatePlan,
};
