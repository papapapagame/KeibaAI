/* ========================================
   Draw State Manager — Ver7.7
   ======================================== */

const HISTORY_KEY = "papapa_iq_draw_history_v77";
const MAX_HISTORY = 120;

let currentDraws = [];
let lastStats = emptyStats();
let lastUpdatedAt = null;
let syncStatus = "idle";

export function setDrawState(draws = [], meta = {}) {
  currentDraws = Array.isArray(draws) ? draws : [];
  lastStats = computeDrawStats(currentDraws);
  lastUpdatedAt = meta.updatedAt || new Date().toISOString();
  syncStatus = meta.syncStatus || "synced";
  return getDrawStateSnapshot();
}

export function getDrawStateSnapshot() {
  return {
    draws: currentDraws,
    stats: { ...lastStats },
    updatedAt: lastUpdatedAt,
    syncStatus,
  };
}

export function computeDrawStats(draws = []) {
  const list = draws || [];
  const active = list.filter((d) => !d.scratched && !d.excluded);
  const frameOk = active.filter((d) => d.frameConfirmed && d.frame > 0).length;
  const jockeyOk = active.filter((d) => d.jockeyConfirmed).length;
  const weightOk = active.filter((d) => d.weightConfirmed).length;
  const scratched = list.filter((d) => d.scratched).length;
  const excluded = list.filter((d) => d.excluded).length;
  const riderChanged = list.filter((d) => d.riderChanged).length;
  const n = active.length || 1;

  return {
    total: list.length,
    active: active.length,
    frameConfirmed: frameOk,
    jockeyConfirmed: jockeyOk,
    weightConfirmed: weightOk,
    scratched,
    excluded,
    riderChanged,
    frameRate: active.length ? Math.round((frameOk / n) * 100) : 0,
    jockeyRate: active.length ? Math.round((jockeyOk / n) * 100) : 0,
    weightRate: active.length ? Math.round((weightOk / n) * 100) : 0,
  };
}

export function recordDrawChange(type, detail = {}, note = "") {
  const entry = {
    id: `dh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    type,
    detail,
    note: note || "",
  };
  const list = loadDrawHistory();
  list.unshift(entry);
  if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
  saveDrawHistory(list);
  return entry;
}

export function diffDraws(prev = [], next = []) {
  const prevMap = new Map((prev || []).map((d) => [String(d.number), d]));
  const changes = [];

  for (const n of next || []) {
    const key = String(n.number);
    const p = prevMap.get(key);
    if (!p) {
      changes.push({
        type: "draw_added",
        number: n.number,
        horse: n.horse,
      });
      continue;
    }

    if (!p.frameConfirmed && n.frameConfirmed) {
      changes.push({
        type: "frame_confirmed",
        number: n.number,
        frame: n.frame,
        horse: n.horse,
      });
    } else if (p.frame !== n.frame && n.frameConfirmed) {
      changes.push({
        type: "frame_changed",
        number: n.number,
        from: p.frame,
        to: n.frame,
        horse: n.horse,
      });
    }

    if (String(p.jockey || "") !== String(n.jockey || "") && n.jockeyConfirmed) {
      changes.push({
        type: "jockey_change",
        number: n.number,
        from: p.jockey,
        to: n.jockey,
        horse: n.horse,
      });
    }

    if (Number(p.weight) !== Number(n.weight) && n.weightConfirmed) {
      changes.push({
        type: "weight_change",
        number: n.number,
        from: p.weight,
        to: n.weight,
        horse: n.horse,
      });
    }

    if (!p.scratched && n.scratched) {
      changes.push({ type: "scratched", number: n.number, horse: n.horse });
    }
    if (!p.excluded && n.excluded) {
      changes.push({ type: "excluded", number: n.number, horse: n.horse });
    }
  }
  return changes;
}

export function loadDrawHistory() {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDrawHistory(list) {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function emptyStats() {
  return computeDrawStats([]);
}

export const DrawStateManager = {
  set: setDrawState,
  get: getDrawStateSnapshot,
  stats: computeDrawStats,
  recordChange: recordDrawChange,
  diff: diffDraws,
  history: loadDrawHistory,
};
