/* ========================================
   UpdateScheduler — Ver7.2
   曜日・開催タイミングに応じた間隔
   ======================================== */

import { nowIso, toNum } from "./utils.js";

export const SCHEDULE_PHASE = {
  WEEKDAY_EARLY: "weekday_early",
  THURSDAY: "thursday",
  FRIDAY: "friday",
  RACE_DAY: "race_day",
  PRE_90_15: "pre_90_15",
  FINAL_15: "final_15",
  POST_RACE: "post_race",
};

const INTERVALS_MS = {
  [SCHEDULE_PHASE.WEEKDAY_EARLY]: 6 * 60 * 60 * 1000, // 月〜水 6h
  [SCHEDULE_PHASE.THURSDAY]: 3 * 60 * 60 * 1000, // 木 3h
  [SCHEDULE_PHASE.FRIDAY]: 60 * 60 * 1000, // 金 1h
  [SCHEDULE_PHASE.RACE_DAY]: 30 * 60 * 1000, // 当日 30m
  [SCHEDULE_PHASE.PRE_90_15]: 15 * 60 * 1000, // 発走90〜15分前 15m
  [SCHEDULE_PHASE.FINAL_15]: 0, // 発走15分前 最終分析（即時1回）
  [SCHEDULE_PHASE.POST_RACE]: null, // Review 待機
};

/**
 * @param {{ now?: Date, isMeetingDay?: boolean, raceStartAt?: string|Date|null, lastFinalAt?: string|null }} ctx
 */
export function resolveSchedulePhase(ctx = {}) {
  const now = ctx.now instanceof Date ? ctx.now : new Date();
  const raceStart = ctx.raceStartAt ? new Date(ctx.raceStartAt) : null;

  if (raceStart && Number.isFinite(raceStart.getTime())) {
    const diffMin = (raceStart.getTime() - now.getTime()) / 60000;
    if (diffMin <= 0) return SCHEDULE_PHASE.POST_RACE;
    if (diffMin <= 15) return SCHEDULE_PHASE.FINAL_15;
    if (diffMin <= 90) return SCHEDULE_PHASE.PRE_90_15;
    if (ctx.isMeetingDay) return SCHEDULE_PHASE.RACE_DAY;
  }

  if (ctx.isMeetingDay) return SCHEDULE_PHASE.RACE_DAY;

  const day = now.getDay(); // 0 Sun ... 5 Fri 6 Sat
  if (day === 4) return SCHEDULE_PHASE.THURSDAY;
  if (day === 5) return SCHEDULE_PHASE.FRIDAY;
  // 月〜水 (1-3)、土日は開催日フラグが無ければ early 扱い（6h）
  return SCHEDULE_PHASE.WEEKDAY_EARLY;
}

export function intervalForPhase(phase) {
  return INTERVALS_MS[phase] ?? INTERVALS_MS[SCHEDULE_PHASE.WEEKDAY_EARLY];
}

export function phaseLabel(phase) {
  const map = {
    [SCHEDULE_PHASE.WEEKDAY_EARLY]: "月〜水相当 · 6時間ごと",
    [SCHEDULE_PHASE.THURSDAY]: "木曜日 · 3時間ごと",
    [SCHEDULE_PHASE.FRIDAY]: "金曜日 · 1時間ごと",
    [SCHEDULE_PHASE.RACE_DAY]: "開催日当日 · 30分ごと",
    [SCHEDULE_PHASE.PRE_90_15]: "発走90〜15分前 · 15分ごと",
    [SCHEDULE_PHASE.FINAL_15]: "発走15分前 · 最終分析",
    [SCHEDULE_PHASE.POST_RACE]: "発走後 · Race Review 待機",
  };
  return map[phase] || phase;
}

export function computeNextUpdateAt(ctx = {}) {
  const phase = resolveSchedulePhase(ctx);
  const interval = intervalForPhase(phase);
  const now = ctx.now instanceof Date ? ctx.now : new Date();

  if (phase === SCHEDULE_PHASE.POST_RACE) {
    return {
      phase,
      phaseLabel: phaseLabel(phase),
      intervalMs: null,
      nextUpdateAt: null,
      status: "review_wait",
      statusLabel: "Race Review 待機",
    };
  }

  if (phase === SCHEDULE_PHASE.FINAL_15) {
    // 最終分析は即時（未実施なら now）
    const done = Boolean(ctx.lastFinalAt);
    return {
      phase,
      phaseLabel: phaseLabel(phase),
      intervalMs: 0,
      nextUpdateAt: done ? null : nowIso(),
      status: done ? "final_done" : "final_due",
      statusLabel: done ? "最終分析済" : "最終分析待ち",
    };
  }

  const last = ctx.lastScheduleAt ? Date.parse(ctx.lastScheduleAt) : NaN;
  const base = Number.isFinite(last) ? last : now.getTime();
  const next = base + toNum(interval, 6 * 60 * 60 * 1000);
  const nextAt = new Date(Math.max(next, now.getTime())).toISOString();

  return {
    phase,
    phaseLabel: phaseLabel(phase),
    intervalMs: interval,
    nextUpdateAt: nextAt,
    status: "scheduled",
    statusLabel: "スケジュール更新待ち",
  };
}

export function isScheduleDue(ctx = {}) {
  const info = computeNextUpdateAt(ctx);
  if (info.status === "review_wait") return false;
  if (info.status === "final_done") return false;
  if (info.status === "final_due") return true;
  if (!info.nextUpdateAt) return false;
  return Date.parse(info.nextUpdateAt) <= Date.now();
}

export const UpdateScheduler = {
  resolvePhase: resolveSchedulePhase,
  computeNext: computeNextUpdateAt,
  isDue: isScheduleDue,
  phaseLabel,
  INTERVALS_MS,
  SCHEDULE_PHASE,
};
