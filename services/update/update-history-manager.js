/* ========================================
   UpdateHistoryManager — Ver7.2
   ======================================== */

import { nowIso, safeParse, formatJa } from "./utils.js";

export const UPDATE_HISTORY_KEY = "papapa_iq_update_history_v72";
export const UPDATE_STATE_KEY = "papapa_iq_update_state_v72";
export const UPDATE_VERSION = "7.2.0";

export function loadUpdateHistory() {
  try {
    const raw = localStorage.getItem(UPDATE_HISTORY_KEY);
    const parsed = safeParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUpdateHistory(list) {
  const next = (list || []).slice(0, 100);
  try {
    localStorage.setItem(UPDATE_HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  return next;
}

export function appendUpdateLog(entry = {}) {
  const row = {
    id: entry.id || `ul_${Date.now()}`,
    timestamp: entry.timestamp || nowIso(),
    change: entry.change || entry.detail || "",
    reason: entry.reason || "",
    analyzed: Boolean(entry.analyzed),
    skipped: Boolean(entry.skipped),
    eventType: entry.eventType || "",
    priority: entry.priority || "",
    analysisStage: entry.analysisStage ?? null,
    confidence: entry.confidence ?? null,
    dataCompleteness: entry.dataCompleteness ?? null,
    version: UPDATE_VERSION,
  };
  const list = [row, ...loadUpdateHistory()];
  saveUpdateHistory(list);
  return row;
}

export function clearUpdateHistory() {
  try {
    localStorage.removeItem(UPDATE_HISTORY_KEY);
  } catch {
    /* ignore */
  }
  return [];
}

export function loadUpdateState() {
  try {
    const raw = localStorage.getItem(UPDATE_STATE_KEY);
    const parsed = safeParse(raw, null);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    /* ignore */
  }
  return createDefaultState();
}

export function saveUpdateState(state) {
  const next = {
    ...createDefaultState(),
    ...state,
    version: UPDATE_VERSION,
    updatedAt: nowIso(),
  };
  try {
    localStorage.setItem(UPDATE_STATE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function createDefaultState() {
  return {
    autoUpdate: true,
    lastUpdateAt: null,
    lastAnalysisAt: null,
    lastScheduleAt: null,
    lastFinalAt: null,
    lastReason: "",
    lastEventType: "",
    lastPriority: "",
    status: "idle",
    statusLabel: "待機中",
    reviewWait: false,
    version: UPDATE_VERSION,
    updatedAt: null,
  };
}

export function formatHistoryRow(row) {
  return `${formatJa(row.timestamp)} · ${row.analyzed ? "再分析" : row.skipped ? "スキップ" : "記録"} · ${row.reason || row.change || ""}`;
}

export const UpdateHistoryManager = {
  load: loadUpdateHistory,
  append: appendUpdateLog,
  clear: clearUpdateHistory,
  loadState: loadUpdateState,
  saveState: saveUpdateState,
  UPDATE_VERSION,
};
