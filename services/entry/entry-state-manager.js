/* ========================================
   Entry State Manager — Ver7.6
   状態変更履歴
   ======================================== */

import {
  ENTRY_STATUS,
  ENTRY_STATUS_LABEL,
  normalizeEntryStatus,
} from "./entry-status.js";

const HISTORY_KEY = "papapa_iq_entry_history_v76";
const MAX_HISTORY = 120;

let currentEntries = [];
let lastStats = emptyStats();
let lastUpdatedAt = null;
let syncStatus = "idle";

export function setEntryState(entries = [], meta = {}) {
  currentEntries = Array.isArray(entries) ? entries : [];
  lastStats = computeEntryStats(currentEntries);
  lastUpdatedAt = meta.updatedAt || new Date().toISOString();
  syncStatus = meta.syncStatus || "synced";
  return getEntryStateSnapshot();
}

export function getEntryStateSnapshot() {
  return {
    entries: currentEntries,
    stats: { ...lastStats },
    updatedAt: lastUpdatedAt,
    syncStatus,
    countsByStatus: { ...lastStats.byStatus },
  };
}

export function computeEntryStats(entries = []) {
  const byStatus = {
    [ENTRY_STATUS.REGISTERED]: 0,
    [ENTRY_STATUS.ENTRY_EXPECTED]: 0,
    [ENTRY_STATUS.CONFIRMED]: 0,
    [ENTRY_STATUS.SCRATCHED]: 0,
    [ENTRY_STATUS.EXCLUDED]: 0,
    [ENTRY_STATUS.WITHDRAWN]: 0,
  };
  for (const e of entries) {
    const s = normalizeEntryStatus(e.entryStatus);
    byStatus[s] = (byStatus[s] || 0) + 1;
  }
  const total =
    byStatus[ENTRY_STATUS.REGISTERED] +
    byStatus[ENTRY_STATUS.ENTRY_EXPECTED] +
    byStatus[ENTRY_STATUS.CONFIRMED] +
    byStatus[ENTRY_STATUS.SCRATCHED] +
    byStatus[ENTRY_STATUS.EXCLUDED] +
    byStatus[ENTRY_STATUS.WITHDRAWN];
  const registered = byStatus[ENTRY_STATUS.REGISTERED];
  const entryExpected = byStatus[ENTRY_STATUS.ENTRY_EXPECTED];
  const scratched = byStatus[ENTRY_STATUS.SCRATCHED];
  const excluded = byStatus[ENTRY_STATUS.EXCLUDED];
  const active =
    byStatus[ENTRY_STATUS.ENTRY_EXPECTED] + byStatus[ENTRY_STATUS.CONFIRMED];
  const completeness = total
    ? Math.round((active / total) * 100)
    : 0;

  return {
    registered,
    entryExpected,
    planned: entryExpected, // 互換
    confirmed: byStatus[ENTRY_STATUS.CONFIRMED],
    scratched,
    excluded,
    withdrawn: byStatus[ENTRY_STATUS.WITHDRAWN],
    active,
    total,
    completeness,
    byStatus,
  };
}

export function recordStatusChange(horseId, fromStatus, toStatus, detail = "") {
  const entry = {
    id: `eh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    horseId,
    from: normalizeEntryStatus(fromStatus),
    to: normalizeEntryStatus(toStatus),
    fromLabel: ENTRY_STATUS_LABEL[normalizeEntryStatus(fromStatus)],
    toLabel: ENTRY_STATUS_LABEL[normalizeEntryStatus(toStatus)],
    detail: detail || "",
  };
  const list = loadHistory();
  list.unshift(entry);
  if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
  saveHistory(list);
  return entry;
}

export function diffEntryStatuses(prev = [], next = []) {
  const prevMap = new Map(
    (prev || []).map((e) => [String(e.horseId || e.number), e])
  );
  const changes = [];
  for (const n of next || []) {
    const key = String(n.horseId || n.number);
    const p = prevMap.get(key);
    if (!p) {
      changes.push({
        type: "entry_added",
        horseId: key,
        to: n.entryStatus,
        horseName: n.horseName || n.horse,
      });
      continue;
    }
    const from = normalizeEntryStatus(p.entryStatus);
    const to = normalizeEntryStatus(n.entryStatus);
    if (from !== to) {
      changes.push({
        type: "entry_status_changed",
        horseId: key,
        from,
        to,
        horseName: n.horseName || n.horse,
      });
      if (to === ENTRY_STATUS.SCRATCHED) {
        changes.push({ type: "entry_scratched", horseId: key, to, horseName: n.horseName || n.horse });
      }
    }
  }
  return changes;
}

export function loadHistory() {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(list) {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function emptyStats() {
  return computeEntryStats([]);
}

export const EntryStateManager = {
  set: setEntryState,
  get: getEntryStateSnapshot,
  stats: computeEntryStats,
  recordChange: recordStatusChange,
  diff: diffEntryStatuses,
  history: loadHistory,
};

export const HorseEntryStateManager = EntryStateManager;
