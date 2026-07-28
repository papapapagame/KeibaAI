/* ========================================
   Connection Telemetry — Live Real Data
   接続URL / HTTP Status / 件数 / Parser・Validator / AI件数 / Mock件数
   ======================================== */

export const CONNECTION_TELEMETRY_VERSION = "10.7.0";
export const CONNECTION_TELEMETRY_KEY = "papapa_iq_connection_telemetry_v107";

const MAX_ENTRIES = 40;

/** @type {Map<string, object>} */
const latestByDomain = new Map();
/** @type {object[]} */
let history = [];
let mockUsageCount = 0;
let aiPayloadCount = 0;

function loadPersisted() {
  try {
    const raw = sessionStorage.getItem(CONNECTION_TELEMETRY_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.history)) history = data.history.slice(-MAX_ENTRIES);
    mockUsageCount = Number(data.mockUsageCount) || 0;
    aiPayloadCount = Number(data.aiPayloadCount) || 0;
    if (data.latest && typeof data.latest === "object") {
      for (const [k, v] of Object.entries(data.latest)) {
        latestByDomain.set(k, v);
      }
    }
  } catch {
    /* ignore */
  }
}

function persist() {
  try {
    const latest = {};
    for (const [k, v] of latestByDomain.entries()) latest[k] = v;
    sessionStorage.setItem(
      CONNECTION_TELEMETRY_KEY,
      JSON.stringify({
        history: history.slice(-MAX_ENTRIES),
        latest,
        mockUsageCount,
        aiPayloadCount,
        updatedAt: new Date().toISOString(),
        version: CONNECTION_TELEMETRY_VERSION,
      })
    );
  } catch {
    /* ignore */
  }
}

loadPersisted();

/**
 * @param {object} entry
 */
export function recordConnection(entry = {}) {
  const row = {
    domain: entry.domain || "unknown",
    providerId: entry.providerId || null,
    url: entry.url || entry.sourceUrl || null,
    requestUrl: entry.requestUrl || entry.url || null,
    httpStatus: entry.httpStatus != null ? Number(entry.httpStatus) : null,
    ok: entry.ok !== false,
    fetchCount: Number(entry.fetchCount) || 0,
    parserCount: Number(entry.parserCount) || 0,
    parserOk: entry.parserOk !== false,
    parserNote: entry.parserNote || null,
    validatorOk: entry.validatorOk != null ? Boolean(entry.validatorOk) : null,
    validatorErrors: Number(entry.validatorErrors) || 0,
    validatorWarnings: Number(entry.validatorWarnings) || 0,
    aiCount: entry.aiCount != null ? Number(entry.aiCount) : null,
    mockUsed: Boolean(entry.mockUsed),
    latencyMs: entry.latencyMs != null ? Number(entry.latencyMs) : null,
    error: entry.error || null,
    downloadSize: entry.downloadSize != null ? Number(entry.downloadSize) : null,
    cacheStatus: entry.cacheStatus || null,
    at: entry.at || new Date().toISOString(),
  };

  latestByDomain.set(row.domain, row);
  history.push(row);
  if (history.length > MAX_ENTRIES) {
    history = history.slice(-MAX_ENTRIES);
  }
  if (row.mockUsed) mockUsageCount += 1;
  if (row.aiCount != null && Number.isFinite(row.aiCount)) {
    aiPayloadCount = Number(row.aiCount);
  }
  persist();
  return row;
}

export function recordMockUsage(count = 1) {
  mockUsageCount += Number(count) || 1;
  persist();
  return mockUsageCount;
}

export function recordAiPayloadCount(count = 0) {
  aiPayloadCount = Number(count) || 0;
  persist();
  return aiPayloadCount;
}

export function getConnectionTelemetry() {
  const latest = {};
  for (const [k, v] of latestByDomain.entries()) latest[k] = v;
  const domains = ["race", "horse", "odds", "weather", "news", "social"];
  const rows = domains.map((d) => latest[d] || null).filter(Boolean);
  return {
    version: CONNECTION_TELEMETRY_VERSION,
    latest,
    history: [...history],
    rows,
    mockUsageCount,
    aiPayloadCount,
    summary: {
      connectedUrls: rows.map((r) => r.url).filter(Boolean),
      httpStatuses: rows.map((r) => ({
        domain: r.domain,
        status: r.httpStatus,
      })),
      fetchCounts: rows.map((r) => ({
        domain: r.domain,
        count: r.fetchCount,
      })),
      parserResults: rows.map((r) => ({
        domain: r.domain,
        ok: r.parserOk,
        count: r.parserCount,
        note: r.parserNote,
      })),
      validatorResults: rows.map((r) => ({
        domain: r.domain,
        ok: r.validatorOk,
        errors: r.validatorErrors,
        warnings: r.validatorWarnings,
      })),
      aiPayloadCount,
      mockUsageCount,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function clearConnectionTelemetry() {
  latestByDomain.clear();
  history = [];
  mockUsageCount = 0;
  aiPayloadCount = 0;
  try {
    sessionStorage.removeItem(CONNECTION_TELEMETRY_KEY);
  } catch {
    /* ignore */
  }
}

export const ConnectionTelemetry = {
  record: recordConnection,
  recordMockUsage,
  recordAiPayloadCount,
  get: getConnectionTelemetry,
  clear: clearConnectionTelemetry,
  version: CONNECTION_TELEMETRY_VERSION,
};
