/* ========================================
   PAPAPA IQ KEIBA - Provider Monitor
   Ver5.2 Real Intelligence Connect
   ======================================== */

const STATS_KEY = "papapa_iq_provider_monitor_v52";

let sessionStats = loadStats();

export function recordProviderRun(row = {}) {
  const id = row.providerId || "unknown";
  const prev = sessionStats[id] || createEmpty(id, row.label);
  const errors = Number(prev.errorCount) || 0;
  const next = {
    providerId: id,
    label: row.label || prev.label || id,
    status: row.status || prev.status || "READY",
    lastFetchedAt: row.updatedAt || prev.lastFetchedAt || null,
    fetchCount: (Number(prev.fetchCount) || 0) + 1,
    lastCount: Number(row.count) || 0,
    errorCount: row.status === "ERROR" ? errors + 1 : errors,
    lastResponseMs: Number(row.responseMs) || 0,
    cacheStatus: row.cacheStatus || prev.cacheStatus || "—",
    implemented: row.implemented !== false,
  };
  sessionStats[id] = next;
  persist();
  return next;
}

export function getMonitorRows(providerResults = [], metas = []) {
  const byId = new Map(providerResults.map((p) => [p.providerId, p]));
  const metaById = new Map(metas.map((m) => [m.id, m]));
  const ids = new Set([
    ...Object.keys(sessionStats),
    ...byId.keys(),
    ...metaById.keys(),
  ]);

  return [...ids].map((id) => {
    const run = byId.get(id) || {};
    const meta = metaById.get(id) || {};
    const stored = sessionStats[id] || createEmpty(id, meta.label || run.label);
    return {
      providerId: id,
      label: run.label || meta.label || stored.label || id,
      status: run.status || meta.status || stored.status || "READY",
      lastFetchedAt: run.updatedAt || stored.lastFetchedAt || null,
      lastCount: run.count != null ? run.count : stored.lastCount,
      errorCount: stored.errorCount || (run.status === "ERROR" ? 1 : 0),
      lastResponseMs: run.responseMs != null ? run.responseMs : stored.lastResponseMs,
      cacheStatus: run.cacheStatus || stored.cacheStatus || "—",
      implemented: meta.implemented !== false && run.implemented !== false,
    };
  });
}

export function clearMonitorStats() {
  sessionStats = {};
  try {
    localStorage.removeItem(STATS_KEY);
  } catch {
    /* ignore */
  }
}

function createEmpty(id, label) {
  return {
    providerId: id,
    label: label || id,
    status: "READY",
    lastFetchedAt: null,
    fetchCount: 0,
    lastCount: 0,
    errorCount: 0,
    lastResponseMs: 0,
    cacheStatus: "—",
    implemented: true,
  };
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persist() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(sessionStats));
  } catch {
    /* ignore */
  }
}
