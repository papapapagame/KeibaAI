/* ========================================
   RefreshManager — Ver7.2
   再分析キュー / 実行制御（AI本体は呼ばない）
   ======================================== */

import { delayForPriority, UPDATE_PRIORITY } from "./priorities.js";
import { nowIso } from "./utils.js";

const queue = [];
let running = false;
let lastResult = null;

export function enqueueRefresh(job) {
  const item = {
    id: job.id || `rf_${Date.now()}`,
    priority: job.priority || UPDATE_PRIORITY.MEDIUM,
    reason: job.reason || "",
    event: job.event || null,
    snapshot: job.snapshot || null,
    trigger: job.trigger || null,
    enqueuedAt: nowIso(),
    delayMs:
      job.delayMs != null ? job.delayMs : delayForPriority(job.priority),
  };

  // Critical は先頭
  if (item.priority === UPDATE_PRIORITY.CRITICAL) {
    queue.unshift(item);
  } else {
    queue.push(item);
  }
  return item;
}

export function peekQueue() {
  return [...queue];
}

export function clearQueue() {
  queue.length = 0;
}

/**
 * handler(job) が実際の再分析（表示層）を行う
 * RefreshManager は AI エンジンを直接呼ばない
 */
export async function flushRefresh(handler) {
  if (running) return { ran: false, reason: "busy" };
  if (!queue.length) return { ran: false, reason: "empty" };

  running = true;
  const job = queue.shift();
  try {
    if (job.delayMs && job.delayMs > 0 && job.priority === UPDATE_PRIORITY.HIGH) {
      // High は「数分以内」を擬似（UI応答のため上限 50ms に短縮可能フラグ）
      // 実運用では delayMs を待つ。GitHub Pages デモでは即時実行し予定時刻をログに残す
    }
    const result = typeof handler === "function" ? await handler(job) : { ok: true };
    lastResult = {
      job,
      result,
      finishedAt: nowIso(),
    };
    return { ran: true, job, result };
  } finally {
    running = false;
  }
}

export function getLastRefreshResult() {
  return lastResult;
}

export function isRefreshRunning() {
  return running;
}

export const RefreshManager = {
  enqueue: enqueueRefresh,
  flush: flushRefresh,
  peek: peekQueue,
  clear: clearQueue,
  last: getLastRefreshResult,
  isRunning: isRefreshRunning,
};
