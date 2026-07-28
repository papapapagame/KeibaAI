/* ========================================
   Provider Logger — Ver7.4
   ======================================== */

const MAX_LOGS = 80;
const logs = [];

export function logProviderEvent(type, detail = {}) {
  const entry = {
    id: `plog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    type: String(type || "info"),
    ...detail,
  };
  logs.unshift(entry);
  if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
  return entry;
}

export function getProviderLogs(limit = 40) {
  return logs.slice(0, Math.max(1, Number(limit) || 40));
}

export function clearProviderLogs() {
  logs.length = 0;
}

export function formatProviderLogLine(entry) {
  if (!entry) return "";
  const pid = entry.providerId ? `[${entry.providerId}] ` : "";
  const msg = entry.message || entry.note || entry.type;
  return `${entry.at} ${entry.type} ${pid}${msg}`;
}

export const ProviderLogger = {
  log: logProviderEvent,
  list: getProviderLogs,
  clear: clearProviderLogs,
  format: formatProviderLogLine,
};
