/* ========================================
   AnalysisTrigger — Ver7.2
   変更がある場合のみ再分析を許可
   ======================================== */

import { UPDATE_PRIORITY, delayForPriority, reasonForEvent } from "./priorities.js";
import { hashSnapshot, nowIso } from "./utils.js";

let lastSnapshotHash = null;
let lastStage = null;

export function setBaselineSnapshot(snapshot) {
  lastSnapshotHash = hashSnapshot(snapshot);
  if (snapshot?.stage != null) lastStage = Number(snapshot.stage);
  return lastSnapshotHash;
}

export function getBaselineHash() {
  return lastSnapshotHash;
}

/**
 * イベントとスナップショット差分から再分析要否を判定
 */
export function evaluateTrigger(event, nextSnapshot = {}) {
  const nextHash = hashSnapshot(nextSnapshot);
  const stageNow =
    nextSnapshot.stage != null ? Number(nextSnapshot.stage) : lastStage;
  const stageChanged =
    stageNow != null && lastStage != null && stageNow !== lastStage;

  const type = event?.type || "meeting_update";
  const priority = event?.priority || UPDATE_PRIORITY.MEDIUM;

  // Low（ニュース等）は差分があっても即時再分析しない
  if (priority === UPDATE_PRIORITY.LOW && type !== "stage_changed") {
    return {
      shouldAnalyze: false,
      deferToNextSchedule: true,
      reason: reasonForEvent(type, event?.detail),
      priority,
      delayMs: null,
      changed: nextHash !== lastSnapshotHash || stageChanged,
      nextHash,
    };
  }

  // Stage 変化は必ず再分析
  if (type === "stage_changed" || stageChanged) {
    return {
      shouldAnalyze: true,
      deferToNextSchedule: false,
      reason: reasonForEvent("stage_changed", event?.detail || `Stage → ${stageNow}`),
      priority: UPDATE_PRIORITY.CRITICAL,
      delayMs: 0,
      changed: true,
      nextHash,
    };
  }

  const changed = !lastSnapshotHash || nextHash !== lastSnapshotHash;
  if (!changed && type === "schedule_tick") {
    // スケジュールでも中身が同じならスキップ
    return {
      shouldAnalyze: false,
      deferToNextSchedule: false,
      reason: "変更が無いため再分析をスキップしました。",
      priority,
      delayMs: delayForPriority(priority),
      changed: false,
      nextHash,
    };
  }

  if (!changed && !["jockey_change", "scratched", "excluded", "frame_confirmed"].includes(type)) {
    // Critical 系はイベント自体を変化とみなす
    return {
      shouldAnalyze: false,
      deferToNextSchedule: false,
      reason: "変更が無いため再分析をスキップしました。",
      priority,
      delayMs: delayForPriority(priority),
      changed: false,
      nextHash,
    };
  }

  return {
    shouldAnalyze: true,
    deferToNextSchedule: false,
    reason: event?.reason || reasonForEvent(type, event?.detail),
    priority,
    delayMs: delayForPriority(priority),
    changed: true,
    nextHash,
    decidedAt: nowIso(),
  };
}

export function commitBaseline(nextHash, stage) {
  if (nextHash) lastSnapshotHash = nextHash;
  if (stage != null) lastStage = Number(stage);
}

export function buildRaceSnapshot({ race, horses, stage, oddsKey }) {
  return {
    stage: stage ?? null,
    raceId: race?.raceId || race?.number || null,
    trackCondition: race?.trackCondition || null,
    weather: race?.weather || null,
    horses: (horses || []).map((h) => ({
      n: h.number,
      j: h.jockey,
      w: h.weight,
      o: h.odds,
      f: h.frame,
      scratch: Boolean(h.scratched || h.excluded),
    })),
    oddsKey: oddsKey || null,
  };
}

export const AnalysisTrigger = {
  setBaseline: setBaselineSnapshot,
  evaluate: evaluateTrigger,
  commit: commitBaseline,
  buildSnapshot: buildRaceSnapshot,
  getBaselineHash,
};
